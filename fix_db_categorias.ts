import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { extractSearchCategoria } from './src/lib/search-extractors';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: processos, error } = await supabase.from('processos_emendas').select('hash, id_assunto');
  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${processos.length} processos. Updating search_categoria...`);

  for (const p of processos) {
    const categoria = extractSearchCategoria(p.id_assunto);
    const { error: updateError } = await supabase
      .from('processos_emendas')
      .update({ search_categoria: categoria })
      .eq('hash', p.hash);
      
    if (updateError) {
      console.error(`Error updating ${p.hash}:`, updateError);
    }
  }

  console.log('Update complete.');
}

main().catch(console.error);
