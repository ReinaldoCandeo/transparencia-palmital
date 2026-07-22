import { config } from "dotenv";
config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/db-admin";
import { processoEmendaSchema, flattenProcessoParaRow } from "../src/lib/schemas";
import { obterProcessosPaginadoInterno, obterDetalheInterno } from "../src/lib/onedoc";

const MAX_PAGES = 15;
const DATA_CORTE = new Date("2026-07-01");

async function runSync() {
  console.log("🚜 Iniciando Trator (Carga Inicial) - Sincronização 1Doc -> Supabase\n");

  for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
    console.log(`📄 Buscando página ${pagina}...`);
    // Usamos a função interna exportada para não causar conflitos com o next/cache no Node puro
    const { processos, totalPaginas } = await obterProcessosPaginadoInterno(pagina);

    if (processos.length === 0) {
      console.log(`Página ${pagina} não possui emendas, mas continuamos a varredura até a página ${totalPaginas}...`);
    }

    if (pagina > totalPaginas) {
      console.log(`Chegamos na última página disponível (${totalPaginas}). Encerrando varredura.`);
      break;
    }

    const safeProcessos = [];
    let corteAtingido = false;

    // 1. Busca os Detalhes Completos (Formulário) e Validação rigorosa
    for (const p of processos) {
      // Regra de Negócio: Não importar processos antes de 01/07/2026
      if (p.data) {
        const dataProcesso = new Date(p.data);
        if (dataProcesso < DATA_CORTE) {
          console.log(`⚠️ Processo ${p.num_formatado} anterior à data de corte (${p.data}). Abortando restante da varredura...`);
          corteAtingido = true;
          break; // Quebra o for dos processos
        }
      }

      // O endpoint de paginação NÃO retorna os dados do formulário de emenda.
      // Precisamos bater no endpoint de detalhes usando o hash para ter o payload completo!
      const detalheCompleto = await obterDetalheInterno(p.hash);
      if (!detalheCompleto) {
        console.error(`❌ Erro ao buscar detalhes do processo ${p.num_formatado} (${p.hash}). Ignorando.`);
        continue;
      }

      // Injeta o num_formatado (que só vem na listagem) no objeto de detalhes
      detalheCompleto.num_formatado = p.num_formatado;
      const payloadFlat = flattenProcessoParaRow(detalheCompleto);
      const result = processoEmendaSchema.safeParse(payloadFlat);
      if (result.success) {
        safeProcessos.push(result.data);
      } else {
        console.error(`❌ Falha de schema no processo ${p.num_formatado} (${p.hash}). Ignorando este registro.`);
      }
      
      // Delay tático para evitar rate limit na busca de detalhes (já que são chamadas 1:1)
      await new Promise(r => setTimeout(r, 800));
    }

    // 2. Upsert em massa (Batch) para otimizar conexões
    if (safeProcessos.length > 0) {
      const { error } = await supabaseAdmin
        .from("processos_emendas")
        .upsert(safeProcessos); 

      if (error) {
        console.error(`❌ Erro no Upsert coletivo da página ${pagina}:`, error.message);
      } else {
        console.log(`✅ Página ${pagina} sincronizada com sucesso! (${safeProcessos.length} processos salvos)`);
      }
    }

    if (corteAtingido) {
      console.log("🛑 Data de corte alcançada. Interrompendo paginação.");
      break; // Quebra o for das páginas
    }

    // Delay tático para evitar tomar Block/Rate Limit severo da 1Doc
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\n🚜 Carga inicial concluída!");
}

runSync();
