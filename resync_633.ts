import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { syncProcessByHash } from './src/lib/sync-core';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resyncProcess(num: string) {
  console.log(`Buscando processo ${num}...`);
  const { data, error } = await supabase.from('processos_emendas').select('hash, id_emissao_base').eq('num', num);
  
  if (error || !data || data.length === 0) {
    console.error(`Processo ${num} não encontrado no banco de dados.`);
    return;
  }

  for (const p of data) {
    console.log(`Re-sincronizando ${p.hash} (parent: ${p.id_emissao_base})...`);
    // Apaga os anexos e movimentações para forçar recálculo total das urls
    await supabase.from('processos_emendas').update({ anexos: null, movimentacoes: null }).eq('hash', p.hash);
    await syncProcessByHash(p.hash, 50000, p.id_emissao_base || undefined);
    console.log(`Concluído para ${p.hash}`);
  }
}

resyncProcess('633').catch(console.error);
