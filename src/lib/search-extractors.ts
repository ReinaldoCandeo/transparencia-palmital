/**
 * search-extractors.ts
 *
 * Funções puras de extração para as colunas de busca planas (search_*).
 * Importáveis tanto no sync-core (server) quanto em scripts de backfill.
 * NÃO importa nada de React/componentes de UI.
 */

import { buildRateioTable, extractFromForm, normalizeLabel } from "@/lib/emendaUtils";

// ─── Normalização ─────────────────────────────────────────────────────────────

/**
 * Remove acentos e converte para lowercase.
 * DEVE ser aplicado em TODA string antes de salvar em colunas de busca,
 * garantindo que 'João' e 'Joao' sejam tratados igualmente no PostgreSQL.
 */
export function removeAcentos(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00BA/g, "o")
    .replace(/\u00AA/g, "a")
    .toLowerCase()
    .trim();
}

// ─── Extractors ───────────────────────────────────────────────────────────────

/**
 * Extrai todos os autores de uma emenda em uma string simples para busca.
 * 🔒 BLINDAGEM: A string salva no banco é SEMPRE sem acentos e em lowercase,
 * garantindo correspondência perfeita com o texto digitado pelo usuário.
 */
export function extractSearchAutores(
  formData: any[],
  conteudoSemHtml?: string
): string {
  if (!Array.isArray(formData)) return "";

  // 1. A função buildRateioTable já tem a inteligência de unir o Autor Principal (do form_data)
  // com os Autores Secundários (extraídos do texto livre via regex), sem duplicatas.
  const rateios = buildRateioTable(formData, conteudoSemHtml);
  if (rateios.length > 0) {
    return removeAcentos(rateios.map((r) => r.autor).join(", "));
  }

  // 2. Fallback final: tenta pegar do campo genérico "autor" ou form explícito caso a regex tenha falhado
  const autorGenerico = 
    extractFromForm(formData, "vereador autor") ||
    extractFromForm(formData, "parlamentar autor") ||
    extractFromForm(formData, "autor");
    
  if (autorGenerico) return removeAcentos(autorGenerico);

  return "";
}

/**
 * Extrai a esfera de governo (Federal, Estadual, Municipal) do form_data.
 * Sanitiza arrays stringify como '["Federal"]' → 'Federal'.
 */
export function extractSearchEsfera(formData: any[]): string {
  if (!Array.isArray(formData)) return "";
  const item = formData.find((f: any) => {
    const norm = normalizeLabel(f.label || "");
    return norm.includes("esfera") || norm === "esfrea" || norm.includes("origem"); // typo histórico e campo "origem"
  });
  if (!item?.valor) return "";

  // Sanitiza array stringificado e normaliza
  let val = item.valor as string;
  if (val.trim().startsWith("[") && val.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) val = parsed.join(" ");
    } catch {
      // mantém original
    }
  }
  
  const normVal = removeAcentos(val).toLowerCase();
  if (normVal.includes("federal")) return "Federal";
  if (normVal.includes("estadual")) return "Estadual";
  if (normVal.includes("municipal") || normVal.includes("camara")) return "Municipal";
  
  return val.trim();
}

/**
 * Mapeia o id_assunto para uma categoria textual legível.
 * Estável e resistente a mudanças: novos assuntos mapeiam para "outros".
 */
export function extractSearchCategoria(idAssunto: number): string {
  const MAP: Record<number, string> = {
    1915747: "saude",
    1915739: "terceiro_setor",
    1915759: "esporte", // Emenda Parlamentar - ESPORTE (formato antigo)
    1915772: "terceiro_setor", // Terceiro Setor - Emendas Municipais - ESPORTE
    1915740: "terceiro_setor",
    1915774: "terceiro_setor", // Agricultura e Meio Ambiente
    1915763: "terceiro_setor", // Educação e Cultura
    1915764: "terceiro_setor", // Saúde (municipal repasse)
  };
  return MAP[idAssunto] ?? "outros";
}

/**
 * Extrai o ano da emenda do formulário ou do texto livre.
 * Procura por "Exercício", "Ano" ou "Ano da Emenda" no form_data.
 * Fallback para o texto livre se necessário.
 */
export function extractAnoEmenda(formData: any[], conteudoSemHtml?: string): number | null {
  if (Array.isArray(formData)) {
    const item = formData.find((f: any) => {
      const norm = normalizeLabel(f.label || "");
      return norm.includes("exercicio") || norm === "ano" || norm.includes("ano da emenda");
    });
    if (item?.valor) {
      const match = item.valor.match(/\b(20\d{2})\b/);
      if (match) return parseInt(match[1], 10);
    }
  }

  if (conteudoSemHtml) {
    const match = conteudoSemHtml.match(/\b(?:exerc[ií]cio|ano)(?:\s+de)?\s*(20\d{2})\b/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}
