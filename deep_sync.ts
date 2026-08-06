import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { obterProcessosPaginadoInterno } from './src/lib/onedoc';
import { syncProcessByHash } from './src/lib/sync-core';
import { extractSearchCategoria } from './src/lib/search-extractors';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting deep sync for older pages...");
  // Busca hashes já existentes
  const { data: dbProcessos } = await supabase.from('processos_emendas').select('hash');
  const hashesExistentes = new Set(dbProcessos?.map((d: any) => d.hash) || []);

  let page = 1;
  let totalPaginas = 1;

  while (page <= totalPaginas) {
    console.log(`Buscando pagina ${page}...`);
    const result = await obterProcessosPaginadoInterno(page);
    if (result.totalPaginas > 1) {
      totalPaginas = result.totalPaginas;
    }

    const processos = result.processos;
    if (!processos) {
      page++;
      continue;
    }

    for (const p of processos) {
      if (!hashesExistentes.has(p.hash)) {
        console.log(`[DEEP SYNC] Sincronizando novo processo encontrado: ${p.hash} (Assunto: ${p.id_assunto})`);
        const resultSync = await syncProcessByHash(p.hash, 50000);
        const novo = resultSync?.data;
        if (novo) {
          hashesExistentes.add(novo.hash);
          
          // Forçar atualização da search_categoria caso precise
          const categoria = extractSearchCategoria(novo.id_assunto);
          await supabase.from('processos_emendas').update({ search_categoria: categoria }).eq('hash', novo.hash);
        }
      }
    }
    
    page++;
    
    // Safety limit to avoid infinite loops, adjust if necessary
    if (page > 200) {
      console.log("Reached page 200, stopping to avoid too long execution.");
      break;
    }
  }

  console.log("Deep sync completed.");
}

run().catch(console.error);
