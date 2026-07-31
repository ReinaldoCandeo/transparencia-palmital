import BuscaProcessosClient from "@/components/portal/BuscaProcessosClient";
import { supabase } from "@/lib/db-client";
import type { ProcessoEmendaRow } from "@/lib/schemas";
import { removeAcentos } from "@/lib/search-extractors";

export const dynamic = "force-dynamic";

export default async function PaginaBuscaProcessos({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // 🔒 BLINDAGEM 1: Validação de URL Envenenada (NaN / valores inválidos)
  // Só aplicamos filtros com tipos corretos e dentro de intervalos sãos.
  const anoBruto = parseInt(params.ano as string, 10);
  const ano =
    !isNaN(anoBruto) && anoBruto > 2000 && anoBruto < 2100 ? anoBruto : null;
  const categoria =
    typeof params.categoria === "string" ? params.categoria : undefined;
  const esfera =
    typeof params.esfera === "string" ? params.esfera : undefined;

  // 🔒 BLINDAGEM 2: Normaliza o texto do autor antes de enviar ao Supabase,
  // igualando o formato com o que está salvo em search_autores (sem acentos, lowercase).
  const autorBruto =
    typeof params.autor === "string" ? params.autor.trim() : undefined;
  const autor = autorBruto ? removeAcentos(autorBruto) : undefined;

  // Monta a query de forma incremental — cada filtro só é aplicado se existir
  // Seleciona apenas as colunas necessárias para a listagem (sem form_data / movimentacoes / anexos)
  let query = supabase
    .from("processos_emendas")
    .select(
      "hash, num, ano, num_formatado, assunto, data, hora, origem_setor, situacao_atual, search_autores, search_categoria, search_esfera, search_ano, form_data"
    )
    .is("id_emissao_base", null)
    .order("data", { ascending: false })
    .order("hora", { ascending: false });

  if (ano) query = query.eq("search_ano", ano);
  if (categoria) query = query.eq("search_categoria", categoria);
  if (esfera) query = query.eq("search_esfera", esfera);
  if (autor)
    query = query.textSearch("search_autores", autor, {
      type: "websearch",
      config: "portuguese",
    });

  const { data: processos, error } = await query;

  if (error) {
    console.error("[SSR] Erro ao buscar processos do Supabase:", error);
  }

  // Filtros ativos passados para o Client Component (para inicializar os selects corretamente)
  const filtrosAtivos = {
    ano: ano?.toString() ?? "",
    categoria: categoria ?? "",
    esfera: esfera ?? "",
    autor: autorBruto ?? "",
  };

  return (
    <BuscaProcessosClient
      processos={(processos as ProcessoEmendaRow[]) || []}
      paginaAtual={1}
      totalPaginas={1}
      filtrosAtivos={filtrosAtivos}
    />
  );
}
