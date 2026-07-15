import type { ProcessoPublico } from "@/lib/onedoc";
import BuscaProcessosClient from "@/components/portal/BuscaProcessosClient";

export const dynamic = "force-dynamic";

export default async function PaginaBuscaProcessos({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  
  // Extrai filtros da URL (desabilitado na PoC)
  const pagina = params.pagina ? parseInt(params.pagina as string, 10) : 1;

  // Server Component não carrega mais processos — o Modo Radar no client faz isso
  const processos: ProcessoPublico[] = [];
  const paginaAtual = 1;
  const totalPaginas = 1;

  return (
    <BuscaProcessosClient 
      processos={processos} 
      paginaAtual={paginaAtual} 
      totalPaginas={totalPaginas}
    />
  );
}
