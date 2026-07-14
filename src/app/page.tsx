import { get1DocProcesses } from "@/lib/onedoc";
import BuscaProcessosClient from "@/components/portal/BuscaProcessosClient";

export const dynamic = 'force-dynamic';

export default async function PaginaBuscaProcessos() {
  const processos = await get1DocProcesses();
  
  return <BuscaProcessosClient initialProcessos={processos} />;
}
