import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { syncProcessByHash } from '../src/lib/sync-core';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function rescueAnexos() {
  console.log("Iniciando varredura para resgate de anexos (migração para id_externo)...");

  const { data: processos, error } = await supabase
    .from('processos_emendas')
    .select('hash, num_formatado, anexos, movimentacoes');

  if (error) {
    console.error("Erro ao buscar processos:", error);
    return;
  }

  let totalProcessosAfetados = 0;

  for (const proc of processos) {
    let precisaAtualizarDB = false;
    let novoAnexos = proc.anexos ? [...proc.anexos] : [];
    let novoMovimentacoes = proc.movimentacoes ? [...proc.movimentacoes] : [];

    // Processar anexos principais
    for (let i = 0; i < novoAnexos.length; i++) {
      const a = novoAnexos[i];
      if (!a.url_storage) {
        console.log(`[LIMPEZA] Processo ${proc.num_formatado}: Anexo principal ${a.arquivo} está sem URL (nulo ou undefined)`);
        precisaAtualizarDB = true;
      }
    }

    // Processar anexos nas movimentacoes
    for (let mIdx = 0; mIdx < novoMovimentacoes.length; mIdx++) {
      const mov = novoMovimentacoes[mIdx];
      if (mov.anexos && Array.isArray(mov.anexos)) {
        for (let aIdx = 0; aIdx < mov.anexos.length; aIdx++) {
          const a = mov.anexos[aIdx];
          if (!a.url_storage) {
            console.log(`[LIMPEZA] Processo ${proc.num_formatado} | Movimentação ${mov.evento}: Anexo ${a.arquivo} está sem URL`);
            precisaAtualizarDB = true;
          }
        }
      }
    }

    if (precisaAtualizarDB) {
      console.log(`[RESYNC] Refazendo sync completo do processo ${proc.num_formatado} via API da 1Doc...`);
      await delay(2000); // Delay de resiliência exigido
      await syncProcessByHash(proc.hash);
      totalProcessosAfetados++;
    }
  }

  console.log(`Concluído! ${totalProcessosAfetados} processos foram reparados e re-sincronizados.`);
}

rescueAnexos();
