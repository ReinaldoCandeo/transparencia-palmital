import { listarProcessos } from "@/lib/onedoc";
import BuscaProcessosClient from "@/components/portal/BuscaProcessosClient";

export const dynamic = "force-dynamic";

export default async function PaginaBuscaProcessos() {
  const processos = await listarProcessos();

  return <BuscaProcessosClient initialProcessos={processos} />;
}
