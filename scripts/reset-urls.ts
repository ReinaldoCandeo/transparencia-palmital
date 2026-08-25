import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log('Iniciando limpeza de url_storage...');
  const { data, error } = await supabase.from('processos_emendas').select('hash, anexos, movimentacoes');
  
  if (error) {
    console.error('Erro ao buscar:', error);
    return;
  }

  let updateCount = 0;

  for (const p of data) {
    let modified = false;

    // Limpa url_storage dos anexos globais
    if (Array.isArray(p.anexos)) {
      for (const a of p.anexos) {
        if (a.url_storage) {
          a.url_storage = null;
          modified = true;
        }
      }
    }

    // Limpa url_storage das movimentacoes
    if (Array.isArray(p.movimentacoes)) {
      for (const m of p.movimentacoes) {
        if (Array.isArray(m.anexos)) {
          for (const a of m.anexos) {
            if (a.url_storage) {
              a.url_storage = null;
              modified = true;
            }
          }
        }
      }
    }

    if (modified) {
      await supabase.from('processos_emendas').update({
        anexos: p.anexos,
        movimentacoes: p.movimentacoes
      }).eq('hash', p.hash);
      updateCount++;
      console.log('URLs limpas para o processo:', p.hash);
    }
  }

  console.log('Concluido! Processos resetados:', updateCount);
}

main();
