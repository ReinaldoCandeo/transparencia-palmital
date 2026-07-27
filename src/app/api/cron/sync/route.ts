import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db-admin";
import { processoEmendaSchema, flattenProcessoParaRow } from "@/lib/schemas";
import { obterProcessosPaginadoInterno, obterDetalheInterno } from "@/lib/onedoc";
import { syncAnexoStorage } from "@/lib/storage-sync";

// =========================================================================
// ⏱️ PROTEÇÃO SERVERLESS VERCEL
// Garante que a requisição seja morta em 10s se travar, e 
// impede cache estático da rota (force-dynamic).
// =========================================================================
export const maxDuration = 10; 
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

    const dbMap = new Map(dbProcessos?.map((d) => [d.hash, d]) || []);
    
    // Gatilho por TTL (3 dias)
    const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
    const agora = Date.now();

    const processosParaSincronizar = processos.filter((p) => {
      const dbProc = dbMap.get(p.hash);
      if (!dbProc) return true; // Novo processo
      
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
    const TIMEOUT_MS = 7000;
    let timeExceeded = false;
    const safeProcessos = [];

    // 3. Validação Individual (Zod) - Agora rodando apenas na fila limitada
    for (const p of processosLimitados) {
      if (timeExceeded) break; // Sai se o tempo geral estourou no processo anterior

      // O endpoint de paginação NÃO retorna os dados do formulário de emenda.
      // Precisamos bater no endpoint de detalhes usando o hash para ter o payload completo!
      const detalheCompleto = await obterDetalheInterno(p.hash);
      if (!detalheCompleto) {
        console.error(`[CRON] Erro ao buscar detalhes do processo ${p.num_formatado} (${p.hash}). Ignorando.`);
        continue;
      }

      // Prepara mapa de URLs existentes para não baixar o que já temos
      const dbData = dbMap.get(p.hash);
      const existingUrls = new Map<string, string>();
      if (dbData) {
        if (Array.isArray(dbData.anexos)) {
          dbData.anexos.forEach((a: any) => { if (a.arquivo && a.url_storage) existingUrls.set(a.arquivo, a.url_storage) });
        }
        if (Array.isArray(dbData.movimentacoes)) {
          dbData.movimentacoes.forEach((m: any) => {
            if (Array.isArray(m.anexos)) m.anexos.forEach((a: any) => { if (a.arquivo && a.url_storage) existingUrls.set(a.arquivo, a.url_storage) });
          });
        }
      }

      // 3.5 Escopo Cirúrgico de Download (Sincronização Sequencial e Progressiva no Storage)
      const downloadAnexosSequencial = async (anexos: any[]) => {
        if (!anexos || anexos.length === 0) return;
        
        for (const a of anexos) {
          if (!a._url_original) continue;
          
          // Se já baixamos antes (Cache), apenas reaproveita a URL
          if (existingUrls.has(a.arquivo)) {
            a.url_storage = existingUrls.get(a.arquivo);
            continue;
          }

          if (a.url_storage) continue;

          // Circuit Breaker: Verifica o relógio antes de iniciar um novo download
          if (Date.now() - cronStartTime > TIMEOUT_MS) {
            timeExceeded = true;
            console.warn(`[CRON] Timeout de ${TIMEOUT_MS}ms atingido. Pausando downloads do processo ${p.hash}...`);
            break;
          }

          // Baixa um por vez (Evita OOM e Network Congestion)
          a.url_storage = await syncAnexoStorage(p.hash, a._url_original, a.arquivo);
        }
      };
      
      // Executa o download sequencial progressivo
      if (!timeExceeded) {
        await downloadAnexosSequencial(detalheCompleto.anexos || []);
      }
      
      for (const m of detalheCompleto.movimentacoes || []) {
        if (timeExceeded) break;
        await downloadAnexosSequencial(m.anexos || []);
      }

      const payloadFlat = flattenProcessoParaRow(detalheCompleto);
      const result = processoEmendaSchema.safeParse(payloadFlat);
      if (result.success) {
        safeProcessos.push(result.data);
      } else {
        console.error(`[CRON] Erro de Schema no Processo: ${p.num_formatado} (${p.hash})`);
      }
    }

    // 4. Inserção Idempotente (Upsert)
    // Se o processo já existir no Supabase (pelo hash), atualiza a `situacao_atual`.
    if (safeProcessos.length > 0) {
      const { error } = await supabaseAdmin
        .from("processos_emendas")
        .upsert(safeProcessos);

      if (error) {
        throw new Error(`Falha no upsert (Supabase): ${error.message}`);
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
