import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db-admin";
import { obterProcessosPaginadoInterno, extractVinculadosHashesFromHtml } from "@/lib/onedoc";
import { syncProcessByHash } from "@/lib/sync-core";

// =========================================================================
// ⏱️ PROTEÇÃO SERVERLESS VERCEL
// Garante que a requisição seja morta em 60s se travar, e 
// impede cache estático da rota (force-dynamic).
// =========================================================================
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Barreira de Segurança (Authorization)
    const authHeader = req.headers.get("authorization");
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
      console.warn("🔒 [CRON] Tentativa de acesso não autorizada à rota de sync.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Identifica o modo de operação (padrão: retry)
    const mode = req.nextUrl.searchParams.get("mode") || "retry";
    console.log(`⏱️ [CRON] Iniciado no modo: ${mode.toUpperCase()}`);

    let processosParaSincronizar: string[] = [];

    // =========================================================================
    // MODO SHALLOW: Busca Página 1 da 1Doc ("O Guardião")
    // Foco: Pegar novas movimentações de processos vivos que o Webhook perdeu.
    // =========================================================================
    if (mode === "shallow") {
      const { processos } = await obterProcessosPaginadoInterno(1);

      if (!processos || processos.length === 0) {
        return NextResponse.json({ ok: true, message: "Nenhum processo retornado da 1Doc." });
      }

      const hashes = processos.map((p) => p.hash);
      const { data: dbProcessos } = await supabaseAdmin
        .from("processos_emendas")
        .select("hash, ultima_sincronizacao")
        .in("hash", hashes);

      const dbMap = new Map<string, any>(dbProcessos?.map((d: any) => [d.hash, d]) || []);
      
      // Gatilho: Processos na página 1 que não foram sincronizados nas últimas 24h
      const umDiaMs = 24 * 60 * 60 * 1000;
      const agora = Date.now();

      processosParaSincronizar = processos
        .filter((p) => {
          const dbProc = dbMap.get(p.hash);
          if (!dbProc) return true; // Novo processo que o webhook perdeu de vez
          const ultimaSinc = dbProc.ultima_sincronizacao ? new Date(dbProc.ultima_sincronizacao).getTime() : 0;
          return (agora - ultimaSinc) > umDiaMs;
        })
        .map((p) => p.hash);
    } 
    // =========================================================================
    // MODO DEEP SWEEP: Varredura Profunda (Carrossel Infinito)
    // Foco: Puxar os processos mais antigos sem sincronização no BD e forçar o sync.
    // =========================================================================
    else if (mode === "deep") {
      const { data: dbProcessos } = await supabaseAdmin
        .from("processos_emendas")
        .select("hash")
        .order("ultima_sincronizacao", { ascending: true, nullsFirst: true })
        .limit(20);

      if (dbProcessos && dbProcessos.length > 0) {
        processosParaSincronizar = dbProcessos.map((p: any) => p.hash);
      } else {
        return NextResponse.json({ ok: true, message: "Nenhum processo no banco para o deep sweep." });
      }
    }
    // =========================================================================
    // MODO RETRY / VINCULADOS: Busca no Supabase (Resiliência de Anexos)
    // Foco: Retentar processos que falharam no download de PDFs.
    // =========================================================================
    else {
      // Busca os últimos 500 processos modificados para varredura em memória
      const { data: dbProcessos } = await supabaseAdmin
        .from("processos_emendas")
        .select("hash, anexos, movimentacoes, id_emissao")
        .order("ultima_sincronizacao", { ascending: false })
        .limit(500);

      if (dbProcessos) {
        if (mode === "vinculados") {
          // Extrai todos os hashes vinculados e identifica quais precisam ser baixados
          const vinculadosMap = new Map<string, string>(); // vinculadoHash -> parentIdEmissao
          dbProcessos.forEach((dbProc: any) => {
            if (Array.isArray(dbProc.movimentacoes)) {
              dbProc.movimentacoes.forEach((m: any) => {
                if (m.conteudo) {
                  const hashes = extractVinculadosHashesFromHtml(m.conteudo);
                  hashes.forEach(h => vinculadosMap.set(h, dbProc.id_emissao));
                }
              });
            }
          });

          if (vinculadosMap.size > 0) {
            // Verifica quais já existem
            const { data: existentes } = await supabaseAdmin
              .from("processos_emendas")
              .select("hash")
              .in("hash", Array.from(vinculadosMap.keys()));
              
            const hashesExistentes = new Set(existentes?.map(e => e.hash) || []);
            
            // Filtra os que não existem
            for (const [vHash, parentId] of Array.from(vinculadosMap.entries())) {
              if (!hashesExistentes.has(vHash)) {
                processosParaSincronizar.push(`${vHash}:${parentId}`);
              }
            }
          }
        } else {
          // Modo retry (anexos pendentes)
          processosParaSincronizar = dbProcessos
            .filter((dbProc: any) => {
            let temAnexoPendente = false;
            if (Array.isArray(dbProc.anexos)) {
              if (dbProc.anexos.some((a: any) => a.arquivo && !a.url_storage)) temAnexoPendente = true;
            }
            if (Array.isArray(dbProc.movimentacoes)) {
              if (dbProc.movimentacoes.some((m: any) => Array.isArray(m.anexos) && m.anexos.some((a: any) => a.arquivo && !a.url_storage))) {
                temAnexoPendente = true;
              }
            }
            return temAnexoPendente;
          })
          .map((p) => p.hash);
        }
      }
    }

    // Funil de Segurança (Circuit Breaker)
    // - Shallow: até 10 processos (só texto geralmente)
    // - Deep: até 20 processos (checa a API se houve alteração)
    // - Retry/Vinculados: até 2 processos (envolve download de PDF)
    const limit = mode === "shallow" ? 10 : (mode === "deep" ? 20 : 2);
    const processosLimitados = processosParaSincronizar.slice(0, limit);

    if (processosLimitados.length === 0) {
      console.log(`⏱️ [CRON] Modo ${mode}: Nenhum processo pendente. Tudo atualizado.`);
      return NextResponse.json({ ok: true, message: "Tudo atualizado." });
    }

    console.log(`⏱️ [CRON] Encontrados ${processosParaSincronizar.length} pendências. Sincronizando batch de ${processosLimitados.length}...`);

    const TIMEOUT_MS = 50000;
    let timeExceeded = false;
    const safeProcessos = [];

    // 3. Validação e Sincronização via Camada Core
    for (const item of processosLimitados) {
      if (timeExceeded) break;

      let hashToSync = item;
      let parentId: string | undefined = undefined;

      // Se for modo vinculados, o item é "hash:parentId"
      if (mode === "vinculados" && item.includes(":")) {
        const parts = item.split(":");
        hashToSync = parts[0];
        parentId = parts[1];
      }

      const result = await syncProcessByHash(hashToSync, TIMEOUT_MS, parentId);
      
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
    // Try/Catch Blindado
    console.error("❌ [CRON FATAL ERROR]:", error.message || error);
    return NextResponse.json(
      { ok: false, message: "Falha na sincronização", error: error.message },
      { status: 200 }
    );
  }
}
