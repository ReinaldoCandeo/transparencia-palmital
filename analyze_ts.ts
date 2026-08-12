import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ASSUNTOS_TERCEIRO_SETOR = [1915774, 1915763, 1915772, 1915764];

async function run() {
  // 1. Find Terceiro Setor processes
  const { data: emendas, error } = await supabase
    .from('processos_emendas')
    .select('hash, num_formatado, id_assunto, movimentacoes, id_emissao')
    .in('id_assunto', ASSUNTOS_TERCEIRO_SETOR);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Encontradas ${emendas.length} Emendas do Terceiro Setor`);
  
  // 2. Extract Linked Hashes
  const vinculadosHashes = new Set<string>();
  const linkMap = new Map<string, string>(); // linkedHash -> num_formatado origin

  emendas.forEach(emenda => {
    if (Array.isArray(emenda.movimentacoes)) {
      emenda.movimentacoes.forEach((m: any) => {
        if (m.conteudo) {
          const aTags = m.conteudo.match(/<a\s[^>]+>/gi) || [];
          for (const aTag of aTags) {
            if (aTag.includes('data-tipo="2"') || aTag.includes('mention_2')) {
              const hashMatch = aTag.match(/hash=([a-zA-Z0-9]+)/i);
              if (hashMatch && hashMatch[1]) {
                vinculadosHashes.add(hashMatch[1]);
                linkMap.set(hashMatch[1], emenda.num_formatado);
              }
            }
          }
        }
      });
    }
  });

  console.log(`Encontrados ${vinculadosHashes.size} hashes de processos vinculados únicos.`);
  
  if (vinculadosHashes.size === 0) {
    console.log("Nenhum processo vinculado encontrado nas emendas do Terceiro Setor.");
    return;
  }

  // 3. Query the linked processes from the DB
  const { data: vinculados, error: vError } = await supabase
    .from('processos_emendas')
    .select('hash, num_formatado, assunto, movimentacoes, anexos')
    .in('hash', Array.from(vinculadosHashes));

  if (vError) {
    console.error(vError);
    return;
  }

  console.log(`Desses, ${vinculados.length} já estão baixados e no nosso banco de dados.`);

  const analysis = [];
  vinculados.forEach(v => {
    const parentNum = linkMap.get(v.hash);
    
    // Analisar as movimentacoes do vinculado
    const movimentacoesAnalysis = v.movimentacoes ? v.movimentacoes.map((m: any) => ({
      evento: m.evento,
      setor: m.origem_setor,
      data: m.data,
      anexos: m.anexos ? m.anexos.map((a: any) => a.arquivo) : []
    })) : [];
    
    const anexosPrincipais = v.anexos ? v.anexos.map((a: any) => a.arquivo) : [];

    analysis.push({
      emenda_pai: parentNum,
      vinculado_num: v.num_formatado,
      vinculado_assunto: v.assunto,
      anexos_principais: anexosPrincipais.length,
      movimentacoes: movimentacoesAnalysis
    });
  });

  fs.writeFileSync('analise_terceiro_setor.json', JSON.stringify(analysis, null, 2));
  console.log("Salvo em analise_terceiro_setor.json");
}

run();
