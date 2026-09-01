require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function calcularStatusSemantico(situacaoOriginal, movimentacoes) {
  if (!movimentacoes || movimentacoes.length === 0) return "Em Formalização";
  
  const etapas = movimentacoes.map(m => String(m.nome_etapa || m.evento || m.tipo_movimentacao_str || "").toLowerCase());

  if (etapas.some(e => 
    e.includes("envio audesp") || 
    e.includes("publicação prestação de contas") || 
    e.includes("publicacao prestacao de contas") ||
    e.includes("concluído (audesp)")
  )) {
    return "Concluído (AUDESP)";
  }

  if (etapas.some(e => 
    e.includes("prestação de contas final") || 
    e.includes("prestacao de contas final") || 
    e.includes("pareceres da prestação") || 
    e.includes("pareceres da prestacao") ||
    e.includes("documentos de acompanhamento")
  )) {
    return "Em Prestação de Contas";
  }

  if (etapas.some(e => 
    e.includes("empenho") || 
    e.includes("aditivos e alter") || 
    e.includes("execução") || 
    e.includes("execucao")
  )) {
    return "Em Execução";
  }
  
  return "Em Formalização";
}

async function run() {
  const { data: processos, error } = await supabase.from('processos_emendas').select('hash, situacao_atual, movimentacoes');
  if (error) {
    console.error(error);
    return;
  }
  
  let atualizados = 0;
  console.log(`Verificando ${processos.length} processos no banco de dados...`);
  
  for (let p of processos) {
    let parsedMovs = p.movimentacoes;
    if (typeof p.movimentacoes === 'string') {
        parsedMovs = JSON.parse(p.movimentacoes);
    }

    const novoStatus = calcularStatusSemantico(p.situacao_atual, parsedMovs);
    if (novoStatus !== p.situacao_atual) {
      console.log(`Atualizando ${p.hash}: ${p.situacao_atual} -> ${novoStatus}`);
      await supabase.from('processos_emendas').update({ situacao_atual: novoStatus }).eq('hash', p.hash);
      atualizados++;
    }
  }
  console.log(`Finalizado! ${atualizados} processos atualizados.`);
}
run();
