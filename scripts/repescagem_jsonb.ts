import { createClient } from "@supabase/supabase-js";
import { syncProcessByHash } from "../src/lib/sync-core";
import "dotenv/config";

// Script de Migração: Repescagem de Metadados JSONB
// Objetivo: Passar por todos os processos recentes (ex: julho/2026 em diante)
// e forçar o resync pela 1Doc para preencher a nova coluna 'form_data'.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigracao() {
  console.log("Iniciando repescagem para preencher 'form_data' (JSONB)...");
  
  // Buscar todos os processos criados após 01/07/2026
  // ou poderíamos buscar todos onde form_data é null/empty, mas como acabamos
  // de criar a coluna, todos estão empty. A data de corte foca nos do MP.
  const { data: processos, error } = await supabase
    .from("processos_emendas")
    .select("hash, num, ano")
    .gte("data", "2026-07-01") // A partir de 1º de Julho de 2026
    .order("data", { ascending: false });

  if (error) {
    console.error("Erro ao buscar processos:", error);
    process.exit(1);
  }

  console.log(`Encontrados ${processos.length} processos recentes para migração.`);

  let successCount = 0;
  let failCount = 0;

  for (const [index, p] of processos.entries()) {
    console.log(`[${index + 1}/${processos.length}] Sincronizando ${p.num}/${p.ano} (hash: ${p.hash})...`);
    
    try {
      // syncProcessByHash vai bater na 1Doc, puxar o JSON com todos os campos dinâmicos,
      // passar pelo extrairFormData() e salvar na form_data.
      await syncProcessByHash(p.hash);
      successCount++;
    } catch (e) {
      console.error(`Falha ao sincronizar ${p.hash}:`, e);
      failCount++;
    }

    // Rate limiting gentil para a API da 1Doc
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("-----------------------------------------");
  console.log("Repescagem concluída!");
  console.log(`Sucesso: ${successCount}`);
  console.log(`Falha: ${failCount}`);
  process.exit(0);
}

runMigracao();
