import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { extractVinculadosHashesFromHtml } from '../src/lib/onedoc';
import { syncProcessByHash } from '../src/lib/sync-core';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting deep sync for VINCULADOS...");
  
  // 1. Puxa todos os processos para extrair os hashes
  // Vamos puxar em blocos se for muito, mas como é só pra ler campos, dá pra puxar tudo
  const { data: dbProcessos } = await supabase
    .from('processos_emendas')
    .select('hash, movimentacoes, id_emissao');

  if (!dbProcessos) {
    console.log("Nenhum processo no banco.");
    return;
  }

  const vinculadosMap = new Map<string, string>(); // hashVinculado -> parentIdEmissao
  
  dbProcessos.forEach((dbProc: any) => {
    if (Array.isArray(dbProc.movimentacoes)) {
      dbProc.movimentacoes.forEach((m: any) => {
        if (m.conteudo) {
          const hashes = extractVinculadosHashesFromHtml(m.conteudo);
          hashes.forEach(h => vinculadosMap.set(h, dbProc.id_emissao));
        }
      });
    }
  });

  console.log(`Extraidos ${vinculadosMap.size} hashes vinculados (subprocessos).`);

  if (vinculadosMap.size === 0) return;

  // 2. Verifica quais deles já existem na base para não puxar à toa
  // Usar query `in` pode quebrar se passar de 1000 items, então fazemos chunk
  const allHashes = Array.from(vinculadosMap.keys());
  const hashesExistentes = new Set<string>();

  const chunkSize = 200;
  for (let i = 0; i < allHashes.length; i += chunkSize) {
    const chunk = allHashes.slice(i, i + chunkSize);
    const { data: existentes } = await supabase
      .from("processos_emendas")
      .select("hash")
      .in("hash", chunk);
      
    existentes?.forEach(e => hashesExistentes.add(e.hash));
  }

  // Filtra os que não existem
  const hashesParaBaixar = allHashes.filter(h => !hashesExistentes.has(h));

  console.log(`Temos ${hashesParaBaixar.length} vinculados pendentes de sincronização.`);

  let count = 0;
  for (const vHash of hashesParaBaixar) {
    const parentId = vinculadosMap.get(vHash);
    console.log(`[VINCULADOS] Baixando ${vHash} (Filho de ${parentId})`);
    
    // Ignorando erros 500, etc.
    try {
      const result = await syncProcessByHash(vHash, 50000, parentId);
      if (result?.data) {
        count++;
      }
    } catch (e) {
      console.log(`Erro ao sincronizar vinculado ${vHash}:`, e);
    }
  }

  console.log(`Finalizado! ${count} subprocessos baixados.`);
}

run().catch(console.error);
