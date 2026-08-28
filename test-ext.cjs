const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function extractVinculadosHashesFromHtml(html) {
  if (!html) return [];
  const regex = /data-hash=["']([a-fA-F0-9]+)["']/gi;
  const hashes = new Set();
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) hashes.add(match[1].toUpperCase());
  }
  return Array.from(hashes);
}

(async () => {
  const { data } = await supabase.from('processos_emendas').select('hash, num_formatado, movimentacoes').eq('search_categoria', 'terceiro_setor').limit(2);
  for(const p of data) {
    const hashesEncontrados = new Set();
    const movs = p.movimentacoes || [];
    movs.forEach(mov => {
      if (mov.conteudo) {
        extractVinculadosHashesFromHtml(mov.conteudo).forEach(h => hashesEncontrados.add(h));
      }
    });
    console.log('Processo:', p.hash, 'Hashes encontrados na movimentacao:', Array.from(hashesEncontrados));
  }
})();
