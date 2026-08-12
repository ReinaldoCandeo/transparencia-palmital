import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: processos, error } = await supabaseAdmin
    .from("processos_emendas")
    .select("id_assunto, form_data");

  if (error) {
    console.error(error);
    return;
  }

  for (const p of processos) {
    if (p.form_data && Array.isArray(p.form_data)) {
      for (const item of p.form_data) {
        if (item.valor === "353530920260002") {
          console.log(`FOUND IN ID_ASSUNTO: ${p.id_assunto}`);
          return;
        }
      }
    }
  }
  console.log("Not found");
}

main().catch(console.error);
