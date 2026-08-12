import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase.from('processos_emendas').select('*').eq('num_formatado', '633/2026').single();
  if (error) {
    console.error(error);
    return;
  }
  fs.writeFileSync('633_dump.json', JSON.stringify(data, null, 2));
  console.log('Saved to 633_dump.json');
}
main();
