import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { syncProcessByHash } from './src/lib/sync-core';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndResync() {
  const { data, error } = await supabase.from('processos_emendas').select('hash, id_emissao_base, anexos, movimentacoes');
  
  if (error || !data) return;

  const toResync = [];

  for (const p of data) {
    const filenames = new Set();
    let hasDuplicate = false;

    const allAnexos = [
      ...(p.anexos || []),
      ...(p.movimentacoes || []).flatMap((m: any) => m.anexos || [])
    ];

    for (const a of allAnexos) {
      if (a.arquivo) {
        if (filenames.has(a.arquivo)) {
          hasDuplicate = true;
          break;
        }
        filenames.add(a.arquivo);
      }
    }

    if (hasDuplicate) {
      toResync.push(p);
    }
  }

  console.log(`Encontrados ${toResync.length} processos com nomes de arquivos duplicados para resync.`);

  for (const p of toResync) {
    console.log(`Re-sincronizando ${p.hash}...`);
    await supabase.from('processos_emendas').update({ anexos: null, movimentacoes: null }).eq('hash', p.hash);
    await syncProcessByHash(p.hash, 50000, p.id_emissao_base || undefined);
    console.log(`Concluído para ${p.hash}`);
  }
}

checkAndResync().catch(console.error);
