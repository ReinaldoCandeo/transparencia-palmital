import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db-admin";
import { processoEmendaSchema, flattenProcessoParaRow } from "@/lib/schemas";
import { obterProcessosPaginadoInterno, obterDetalheInterno } from "@/lib/onedoc";

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

    const safeProcessos = [];

    // 3. Validação Individual (Zod)
    for (const p of processos) {
      // O endpoint de paginação NÃO retorna os dados do formulário de emenda.
      // Precisamos bater no endpoint de detalhes usando o hash para ter o payload completo!
      const detalheCompleto = await obterDetalheInterno(p.hash);
      if (!detalheCompleto) {
        console.error(`[CRON] Erro ao buscar detalhes do processo ${p.num_formatado} (${p.hash}). Ignorando.`);
        continue;
      }

      detalheCompleto.num_formatado = p.num_formatado;
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
