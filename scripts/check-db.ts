import { config } from "dotenv";
config({ path: ".env.local" });
import { supabaseAdmin } from "../src/lib/db-admin";

async function check() {
  const { data, error } = await supabaseAdmin.from("processos_emendas").select("num_formatado, assunto, data, hash, emenda_valor_formatado, social_valor_total");
  if (error) {
    console.error("Erro:", error);
    return;
  }
  console.log(`Encontrados ${data.length} processos no banco de dados!`);
  console.table(data);
}
check();
