const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log('Resetting ultima_sincronizacao for all processes...');
  const { error } = await supabase.from('processos_emendas').update({ ultima_sincronizacao: '2000-01-01T00:00:00Z' }).neq('hash', '');
  if (error) {
    console.error('Failed to reset:', error);
    process.exit(1);
  }
  console.log('Successfully reset all processes. Now triggering cron sync multiple times until complete...');
  // We can just call the cron endpoint. We need to find the CRON_SECRET.
  const cronKeyMatch = env.match(/CRON_SECRET=(.*)/);
  if(cronKeyMatch) {
    const cronKey = cronKeyMatch[1].trim();
    for (let i = 0; i < 5; i++) {
        console.log('Calling cron sync...', i+1);
        const res = await fetch('http://localhost:3000/api/cron/sync?mode=retry', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + cronKey }
        });
        const text = await res.text();
        console.log('Cron result:', text);
        if (text.includes('Nenhum processo pendente') || text.includes('Tudo atualizado')) {
           break;
        }
    }
  } else {
     console.log('No CRON_SECRET found, run cron manually.');
  }
}
run();
