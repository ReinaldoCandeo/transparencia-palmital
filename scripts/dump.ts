import { config } from "dotenv";
config({ path: ".env.local" });
import { obterProcessosPaginadoInterno } from "../src/lib/onedoc";

async function dump() {
  const { processos } = await obterProcessosPaginadoInterno(9);
  if (processos.length > 0) {
    console.log(JSON.stringify(processos[0], null, 2));
  }
}
dump();
