import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { obterHashPorNumeroInterno } from './src/lib/onedoc';
import { syncProcessByHash } from './src/lib/sync-core';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fetchNewProcess(numero: string, ano: string) {
  console.log(`Buscando hash do processo ${numero}/${ano} na 1Doc...`);
  try {
    const hash = await obterHashPorNumeroInterno(numero, ano);
    if (!hash) {
      console.error(`Processo ${numero}/${ano} não encontrado na 1Doc.`);
      return;
    }
    
    console.log(`Hash encontrado: ${hash}. Iniciando sincronização...`);
    await syncProcessByHash(hash, 50000); // 50s timeout
    console.log(`Sincronização do processo ${numero}/${ano} concluída com sucesso!`);
  } catch (err) {
    console.error(`Erro ao buscar processo ${numero}/${ano}:`, err);
  }
}

fetchNewProcess('2612', '2026').catch(console.error);
