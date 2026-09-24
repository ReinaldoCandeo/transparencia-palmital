import { supabaseAdmin } from "../src/lib/db-admin";

async function run() {
  const { data, error } = await supabaseAdmin.from("processos_emendas").select("search_cnpj, search_valor_global").limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
