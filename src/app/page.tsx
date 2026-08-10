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

  // 🔒 BLINDAGEM 3: Entidade — normaliza para corresponder ao formato salvo (sem acentos, lowercase).
  const entidadeBruta =
    typeof params.entidade === "string" ? params.entidade.trim() : undefined;
  const entidade = entidadeBruta ? removeAcentos(entidadeBruta) : undefined;

  // 🔒 BLINDAGEM 4: CNPJ — remove qualquer formatacão antes de buscar.
  // A URL chega limpa (somente dígitos), mas sanitizamos por garantia.
  const cnpjBruto =
    typeof params.cnpj === "string" ? params.cnpj.trim() : undefined;
  const cnpj = cnpjBruto ? cnpjBruto.replace(/[.\-\/]/g, "") : undefined;

  // 🔒 BLINDAGEM 5: Paginação segura
  const pageParam = parseInt(params.page as string, 10);
  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  // Monta a query de forma incremental — cada filtro só é aplicado se existir
  // Seleciona apenas as colunas necessárias para a listagem (sem form_data / movimentacoes / anexos)
  let query = supabase
    .from("processos_emendas")
    .select(
      "hash, num, ano, num_formatado, assunto, data, hora, origem_setor, situacao_atual, search_autores, search_categoria, search_esfera, search_ano, search_entidade, search_cnpj, form_data",
      { count: "exact" }
    )
    .is("id_emissao_base", null)
    .order("data", { ascending: false })
    .order("hora", { ascending: false })
    .range(start, end);

  if (ano) query = query.eq("search_ano", ano);
  if (categoria) query = query.eq("search_categoria", categoria);
  if (esfera) query = query.eq("search_esfera", esfera);
  if (autor)
    query = query.textSearch("search_autores", autor, {
      type: "websearch",
      config: "portuguese",
    });
  if (entidade)
    query = query.textSearch("search_entidade", entidade, {
      type: "websearch",
      config: "portuguese",
    });
  // CNPJ: busca por substring usando ilike + índice pg_trgm (sem curingas no B-Tree)
  if (cnpj) query = query.ilike("search_cnpj", `%${cnpj}%`);

  const { data: processos, count, error } = await query;

  if (error) {
    console.error("[SSR] Erro ao buscar processos do Supabase:", error);
  }

  const totalPaginas = count ? Math.ceil(count / limit) : 1;

  // Filtros ativos passados para o Client Component (para inicializar os selects corretamente)
  const filtrosAtivos = {
    ano: ano?.toString() ?? "",
    categoria: categoria ?? "",
    esfera: esfera ?? "",
    autor: autorBruto ?? "",
    entidade: entidadeBruta ?? "",
    cnpj: cnpjBruto ?? "",
  };

  return (
    <BuscaProcessosClient
      processos={(processos as ProcessoEmendaRow[]) || []}
      paginaAtual={page}
      totalPaginas={totalPaginas}
      filtrosAtivos={filtrosAtivos}
    />
  );
}
