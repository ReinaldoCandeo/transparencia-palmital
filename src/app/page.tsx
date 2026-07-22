import BuscaProcessosClient from "@/components/portal/BuscaProcessosClient";
import { supabase } from "@/lib/db-client";
import type { ProcessoEmendaRow } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function PaginaBuscaProcessos({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  
  // Extrai filtros da URL (desabilitado na PoC)
  const pagina = params.pagina ? parseInt(params.pagina as string, 10) : 1;

  // Busca direto do Banco de Dados (Supabase) via Server Component
  const { data: processos, error } = await supabase
    .from("processos_emendas")
    .select("*")
    .order("data", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    console.error("[SSR] Erro ao buscar processos do Supabase:", error);
  }

  const paginaAtual = 1;
  const totalPaginas = 1;

  return (
    <BuscaProcessosClient 
      processos={(processos as ProcessoEmendaRow[]) || []} 
      paginaAtual={paginaAtual} 
      totalPaginas={totalPaginas}
    />
  );
}
