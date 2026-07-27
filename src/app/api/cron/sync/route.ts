import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db-admin";
import { obterProcessosPaginadoInterno } from "@/lib/onedoc";
import { syncProcessByHash } from "@/lib/sync-core";

// =========================================================================
// ⏱️ PROTEÇÃO SERVERLESS VERCEL
// Garante que a requisição seja morta em 10s se travar, e 
// impede cache estático da rota (force-dynamic).
// =========================================================================
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Barreira de Segurança (Authorization)
    // O Cron Job da Vercel ou serviços externos devem enviar este Header.
    const authHeader = req.headers.get("authorization");
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
      console.warn("🔒 [CRON] Tentativa de acesso não autorizada à rota de sync.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏱️ [CRON] Iniciado. Sincronizando exclusivamente a Página 1...");

    // 2. Extração Controlada (Apenas Página 1)
    // O `obterProcessosPaginadoInterno` já extrai e sanitiza (stripHtml, formatarMoeda, etc)
    const { processos } = await obterProcessosPaginadoInterno(1);

    if (!processos || processos.length === 0) {
      console.log("⏱️ [CRON] Nenhum processo retornado pela 1Doc.");
      return NextResponse.json({ ok: true, message: "Nenhum processo retornado." });
    }

    // 2.5 Consulta Prévia Otimizada no Banco (Batching Incremental)
    const hashes = processos.map((p) => p.hash);
    const { data: dbProcessos } = await supabaseAdmin
      .from("processos_emendas")
      .select("hash, ultima_sincronizacao, anexos, movimentacoes")
      .in("hash", hashes);

    const dbMap = new Map<string, any>(dbProcessos?.map((d: any) => [d.hash, d]) || []);
    
    // Gatilho por TTL (3 dias)
    const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
    const agora = Date.now();

    const processosParaSincronizar = processos.filter((p) => {
      const dbProc = dbMap.get(p.hash);
      if (!dbProc) return true; // Novo processo
      
      // Verifica se o processo tem arquivos que foram pegos no Circuit Breaker (ainda sem url_storage)
      let temAnexoPendente = false;
      if (Array.isArray(dbProc.anexos)) {
        if (dbProc.anexos.some((a: any) => a.arquivo && !a.url_storage)) temAnexoPendente = true;
      }
      if (Array.isArray(dbProc.movimentacoes)) {
        if (dbProc.movimentacoes.some((m: any) => Array.isArray(m.anexos) && m.anexos.some((a: any) => a.arquivo && !a.url_storage))) {
          temAnexoPendente = true;
        }
      }
      
      if (temAnexoPendente) return true; // Força a sincronização se faltam PDFs

      const ultimaSinc = dbProc.ultima_sincronizacao
        ? new Date(dbProc.ultima_sincronizacao).getTime()
        : 0;
      
      return (agora - ultimaSinc) > tresDiasMs;
    });

    // Funil de Segurança: Máximo de 2 processos por vez
    const processosLimitados = processosParaSincronizar.slice(0, 2);

    if (processosLimitados.length === 0) {
      console.log("⏱️ [CRON] Nenhum processo novo ou desatualizado para sincronizar.");
      return NextResponse.json({ ok: true, message: "Tudo atualizado." });
    }

    console.log(`⏱️ [CRON] Encontrados ${processosParaSincronizar.length} processos pendentes. Sincronizando batch de ${processosLimitados.length}...`);

    const cronStartTime = Date.now();
    const TIMEOUT_MS = 50000;
    let timeExceeded = false;
    const safeProcessos = [];

    // 3. Validação e Sincronização via Camada Core
    for (const p of processosLimitados) {
      if (timeExceeded) break; // Sai se o tempo geral estourou no processo anterior

      const result = await syncProcessByHash(p.hash, TIMEOUT_MS);
      
      if (result) {
        safeProcessos.push(result.data);
        if (result.timeExceeded) {
          timeExceeded = true;
        }
      }
    }

    console.log(`✅ [CRON] Finalizado. ${safeProcessos.length} processos verificados/atualizados.`);
    return NextResponse.json({ ok: true, count: safeProcessos.length });

  } catch (error: any) {
    // 5. Try/Catch Blindado (Anti-desligamento de Cron)
    console.error("❌ [CRON FATAL ERROR]:", error.message || error);
    
    // A Vercel desativa CRONs que retornam falha recorrente.
    // Retornamos 200 HTTP, mas encapsulamos o erro no body do JSON.
    return NextResponse.json(
      { ok: false, message: "Falha na sincronização diária", error: error.message },
      { status: 200 }
    );
  }
}
