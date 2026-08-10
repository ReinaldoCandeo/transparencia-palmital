/**
 * scripts/backfill-entidade-cnpj.ts
 *
 * Backfill de uso único: percorre todos os processos que ainda não têm
 * search_entidade ou search_cnpj preenchidos e os popula a partir do
 * form_data já salvo no banco — sem chamar a API da 1Doc.
 *
 * Rodar APÓS o deploy das novas colunas:
 *   npx tsx --env-file=.env.local scripts/backfill-entidade-cnpj.ts
 */

import { createClient } from "@supabase/supabase-js";
import { extractSearchEntidade, extractSearchCnpj } from "../src/lib/search-extractors";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 100;

async function main() {
  console.log("🔄 Iniciando backfill de search_entidade e search_cnpj...");
  let totalProcessados = 0;
  let totalAtualizados = 0;
  let offset = 0;

  while (true) {
    const { data: lote, error } = await supabaseAdmin
      .from("processos_emendas")
      .select("hash, form_data, assunto")
      .or("search_entidade.is.null,search_cnpj.is.null")
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("❌ Erro ao buscar lote:", error.message);
      break;
    }

    if (!lote || lote.length === 0) {
      console.log("✅ Backfill concluído. Nenhum registro pendente.");
      break;
    }

    console.log(`\n📦 Lote ${Math.floor(offset / BATCH_SIZE) + 1}: ${lote.length} registros`);

    for (const p of lote) {
      totalProcessados++;
      const entidade = extractSearchEntidade(p.form_data ?? [], p.assunto) || null;
      const cnpj     = extractSearchCnpj(p.form_data ?? []) || null;

      // Só faz update se há algo a preencher
      if (!entidade && !cnpj) continue;

      const { error: updateError } = await supabaseAdmin
        .from("processos_emendas")
        .update({ search_entidade: entidade, search_cnpj: cnpj })
        .eq("hash", p.hash);

      if (updateError) {
        console.warn(`  ⚠️  ${p.hash}: ${updateError.message}`);
      } else {
        totalAtualizados++;
        console.log(`  ✔  ${p.hash} | entidade="${entidade ?? "-"}" cnpj="${cnpj ?? "-"}"`);
      }
    }

    offset += BATCH_SIZE;

    // Se o lote veio incompleto, chegamos ao fim da tabela
    if (lote.length < BATCH_SIZE) {
      console.log("\n✅ Fim da tabela atingido.");
      break;
    }

    // Pausa leve entre lotes para não sobrecarregar o Supabase
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n📊 Resultado final:`);
  console.log(`   Processados : ${totalProcessados}`);
  console.log(`   Atualizados : ${totalAtualizados}`);
  console.log(`   Sem dados   : ${totalProcessados - totalAtualizados}`);
}

main().catch((e) => {
  console.error("💥 Erro fatal:", e);
  process.exit(1);
});
