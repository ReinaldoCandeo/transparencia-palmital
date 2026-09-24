import { supabaseAdmin } from "../src/lib/db-admin";

async function count() {
  const { count, error } = await supabaseAdmin.from("processos_emendas").select("*", { count: "exact", head: true });
  console.log(`\n=============================\nTOTAL DE PROCESSOS: ${count}\n=============================\n`);
}
count();
