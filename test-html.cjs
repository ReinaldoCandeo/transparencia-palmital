const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await supabase.from('processos_emendas').select('hash, movimentacoes').eq('hash', '61295E9314B2BFA03893D780').single();
  let html = '';
  data.movimentacoes.forEach(m => html += (m.conteudo || ''));
  const regex = /(?:data-hash=["']|[\?&]hash=|&amp;hash=)([a-fA-F0-9]{24})(?:["'&]|&amp;)/gi;
  let match;
  const hashes = new Set();
  while ((match = regex.exec(html)) !== null) { hashes.add(match[1]); }
  console.log('Found hashes:', Array.from(hashes));
})();
