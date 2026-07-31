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

  // 1. Tenta via form_data (Saúde e formulários com campo explícito de autor)
  const autoresForm = formData
    .filter((f: any) => {
      const norm = normalizeLabel(f.label || "");
      return norm.includes("vereador autor") || norm.includes("parlamentar autor");
    })
    .map((f: any) => f.valor as string)
    .filter(Boolean);

  if (autoresForm.length > 0) {
    return removeAcentos(autoresForm.join(", "));
  }

  // 2. Fallback: extrai via buildRateioTable (Terceiro Setor com texto livre)
  const rateios = buildRateioTable(formData, conteudoSemHtml);
  if (rateios.length > 0) {
    return removeAcentos(rateios.map((r) => r.autor).join(", "));
  }

  // 3. Fallback final: tenta pegar do campo genérico "autor"
  const autorGenerico = extractFromForm(formData, "autor");
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
    1915759: "esporte",
    1915740: "terceiro_setor", // mesmo grupo: Terceiro Setor Social
  };
  return MAP[idAssunto] ?? "outros";
}
