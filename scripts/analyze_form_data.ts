import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const labels = new Set<string>();
  const valuesByLabel: Record<string, string[]> = {};

  let offset = 0;
  const BATCH_SIZE = 1000;

  while (true) {
    const { data: processos, error } = await supabaseAdmin
      .from("processos_emendas")
      .select("form_data")
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error(error);
      break;
    }

    if (!processos || processos.length === 0) break;

    for (const p of processos) {
      if (p.form_data && Array.isArray(p.form_data)) {
        for (const item of p.form_data) {
          if (item.label) {
            const label = item.label.trim();
            labels.add(label);
            
            if (!valuesByLabel[label]) {
                valuesByLabel[label] = [];
            }
            if (valuesByLabel[label].length < 3) {
                valuesByLabel[label].push(item.valor);
            }
          }
        }
      }
    }
    offset += BATCH_SIZE;
  }

  console.log("Labels encontrados no form_data:");
  const sorted = Array.from(labels).sort();
  for (const label of sorted) {
    console.log(`\n- ${label}`);
    console.log(`  Exemplos: ${valuesByLabel[label].slice(0, 2).map(v => JSON.stringify(v)).join(", ")}`);
  }
}

main().catch(console.error);
