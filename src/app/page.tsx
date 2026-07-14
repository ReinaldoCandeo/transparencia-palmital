import { buscarProcessosPaginado, type ProcessoPublico } from "@/lib/onedoc";
import BuscaProcessosClient from "@/components/portal/BuscaProcessosClient";

export const dynamic = "force-dynamic";

export default async function PaginaBuscaProcessos({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  
  // Extrai filtros da URL, usando defaults amigáveis
  const pagina = params.pagina ? parseInt(params.pagina as string, 10) : 1;
  const ano = (params.ano as string) || new Date().getFullYear().toString();
  const mes = params.mes as string | undefined;

  let processos: ProcessoPublico[] = [];
  let paginaAtual = 1;
  let totalPaginas = 1;

  try {
    const resultado = await buscarProcessosPaginado(pagina, ano, mes);
    processos = resultado.processos;
    paginaAtual = resultado.paginaAtual;
    totalPaginas = resultado.totalPaginas;
  } catch (err) {
    console.error("[PaginaBusca] Falha ao carregar processos:", err);
  }

  return (
    <BuscaProcessosClient 
      processos={processos} 
      paginaAtual={paginaAtual} 
      totalPaginas={totalPaginas} 
      anoFiltro={ano}
      mesFiltro={mes || ""}
    />
  );
}
