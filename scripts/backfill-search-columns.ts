/**
 * Backfill das colunas de busca planas
 *
 * Percorre todos os processos_emendas existentes no banco, re-extrai os dados
 * de busca (autores, esfera, categoria, ano) e atualiza as novas colunas.
 *
 * Execução: npx tsx scripts/backfill-search-columns.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  extractSearchAutores,
  extractSearchEsfera,
  extractSearchCategoria,
} from "../src/lib/search-extractors";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backfill() {
  console.log("🔍 Buscando todos os processos no banco...");

  const { data: processos, error } = await supabase
    .from("processos_emendas")
    .select("hash, num, ano, id_assunto, form_data, conteudo");

  if (error || !processos) {
    console.error("❌ Erro ao buscar processos:", error);
    return;
  }

  console.log(`📋 Total: ${processos.length} processos a atualizar`);

  let ok = 0;
  let erros = 0;

  for (const p of processos) {
    const formData = Array.isArray(p.form_data) ? p.form_data : [];
    const conteudoSemHtml = (p.conteudo as string | null)
      ?.replace(/<[^>]*>?/gm, "")
      .trim();

    const anoNum = p.ano ? parseInt(p.ano) : null;

    const update = {
      search_autores: extractSearchAutores(formData, conteudoSemHtml) || null,
      search_esfera: extractSearchEsfera(formData) || null,
      search_categoria: extractSearchCategoria(p.id_assunto),
      search_ano: anoNum && !isNaN(anoNum) ? anoNum : null,
    };

    process.stdout.write(
      `  ⟳  ${p.num}/${p.ano} → cat:${update.search_categoria} | autores:${update.search_autores?.slice(0, 30) ?? "-"}  `
    );

    const { error: updErr } = await supabase
      .from("processos_emendas")
      .update(update)
      .eq("hash", p.hash);

    if (updErr) {
      console.log(`❌ ${updErr.message}`);
      erros++;
    } else {
      console.log("✅");
      ok++;
    }

    // Delay gentil para não estressar o banco
    await new Promise((r) => setTimeout(r, 80));
  }

  console.log("\n─────────────────────────────────");
  console.log(`✅ Atualizados:  ${ok}`);
  console.log(`❌ Erros:        ${erros}`);
  console.log("─────────────────────────────────");
}

backfill();
