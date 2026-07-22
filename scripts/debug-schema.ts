import { config } from "dotenv";
config({ path: ".env.local" });
import { obterDetalheInterno } from "../src/lib/onedoc";
import { flattenProcessoParaRow, processoEmendaSchema } from "../src/lib/schemas";

async function checkSchema() {
  const hash = "1C3EAD3C99FF38C03049B2DE";
  const detalheCompleto = await obterDetalheInterno(hash);
  if (!detalheCompleto) return console.log("detalhe falhou");
  
  const payloadFlat = flattenProcessoParaRow(detalheCompleto);
  const result = processoEmendaSchema.safeParse(payloadFlat);
  if (!result.success) {
    console.error(JSON.stringify(result.error.errors, null, 2));
  } else {
    console.log("Sucesso!");
  }
}
checkSchema();
