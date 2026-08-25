import { supabaseAdmin } from "../src/lib/db-admin";
import { syncProcessByHash } from "../src/lib/sync-core";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Iniciando resincronização forçada de todos os processos...");

  try {
    // Busca todos os hashes cadastrados (ordem decrescente de data para pegar os mais novos primeiro)
    const { data: processos, error } = await supabaseAdmin
      .from("processos_emendas")
      .select("hash")
      .order("data", { ascending: false });

    if (error) {
      console.error("❌ Erro ao buscar processos no Supabase:", error.message);
      process.exit(1);
    }

    if (!processos || processos.length === 0) {
      console.log("⚠️ Nenhum processo encontrado na base.");
      process.exit(0);
    }

    console.log(`📦 Encontrados ${processos.length} processos para sincronização.`);

    // Loop sequencial conforme diretriz para evitar Rate Limit
    let count = 0;
    for (const p of processos) {
      count++;
      console.log(`\n🔄 [${count}/${processos.length}] Sincronizando processo: ${p.hash}`);
      
      try {
        await syncProcessByHash(p.hash);
        console.log(`✅ [${count}/${processos.length}] Processo ${p.hash} sincronizado com sucesso!`);
      } catch (syncError: any) {
        console.error(`❌ [${count}/${processos.length}] Falha ao sincronizar o processo ${p.hash}:`, syncError.message || syncError);
      }

      // Delay de 2 segundos (rate limit safeguard)
      if (count < processos.length) {
        console.log("⏳ Aguardando 2 segundos (Rate Limit)...");
        await sleep(2000);
      }
    }

    console.log("\n🎉 Resincronização concluída para todos os processos!");
  } catch (err: any) {
    console.error("\n❌ Falha fatal no script:", err.message || err);
    process.exit(1);
  }
}

main();
