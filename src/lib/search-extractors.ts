/**
 * search-extractors.ts
 *
 * Funções puras de extração para as colunas de busca planas (search_*).
 * Importáveis tanto no sync-core (server) quanto em scripts de backfill.
 * NÃO importa nada de React/componentes de UI.
 */

import { buildRateioTable, extractFromForm, normalizeLabel, parseMoedaToNumber } from "@/lib/emendaUtils";
import {
  ASSUNTOS_TERCEIRO_SETOR,
  ASSUNTOS_SAUDE,
  ASSUNTOS_OBRAS,
  ASSUNTOS_EDUCACAO,
  ASSUNTOS_AGRICULTURA,
  type SearchCategoria
} from "@/lib/assuntos";

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
 * Derivado diretamente dos Sets de assuntos (fonte de verdade).
 */
export function extractSearchCategoria(idAssunto: number): SearchCategoria {
  if (ASSUNTOS_TERCEIRO_SETOR.has(idAssunto)) return "terceiro_setor";
  if (ASSUNTOS_SAUDE.has(idAssunto)) return "saude";
  if (ASSUNTOS_OBRAS.has(idAssunto)) return "obras";
  if (ASSUNTOS_EDUCACAO.has(idAssunto)) return "educacao";
  if (ASSUNTOS_AGRICULTURA.has(idAssunto)) return "agricultura";
  
  return "outros";
}

/**
 * Extrai o ano da emenda do formulário ou do texto livre.
 * Procura por "Exercício", "Ano" ou "Ano da Emenda" no form_data.
 * Fallback para o texto livre se necessário.
 */
export function extractAnoEmenda(formData: any[], conteudoSemHtml?: string): number | null {
  if (Array.isArray(formData)) {
    // 1. Prioridade Alta: "ano de execucao" ou "exercicio" (Formato Novo e Legado de Saúde)
    let itemPrioritario = formData.find((f: any) => {
      const norm = normalizeLabel(f.label || "");
      return norm.includes("ano de execucao") || norm.includes("exercicio");
    });

    // 2. Fallback (Prioridade Baixa): "ano da emenda" ou apenas "ano" (Formatos Legados Genéricos)
    if (!itemPrioritario) {
      itemPrioritario = formData.find((f: any) => {
        const norm = normalizeLabel(f.label || "");
        return norm.includes("ano da emenda") || norm === "ano";
      });
    }

    if (itemPrioritario?.valor) {
      const match = itemPrioritario.valor.match(/\b(20\d{2})\b/);
      if (match) return parseInt(match[1], 10);
    }
  }

  // 3. Fallback final no texto livre (caso falhe o JSON)
  if (conteudoSemHtml) {
    const match = conteudoSemHtml.match(/\b(?:exerc[ií]cio|ano)(?:\s+de)?\s*(20\d{2})\b/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Extrai o nome da Entidade Beneficiária do form_data.
 * Tenta labels conhecidos em ordem de prioridade e, como fallback,
 * usa o último segmento do campo assunto (padrão antigo do 1Doc).
 * String salva sem acentos e lowercase para compatibilidade com textSearch.
 */
export function extractSearchEntidade(
  formData: any[],
  assunto?: string | null
): string {
  if (Array.isArray(formData)) {
    const nome =
      extractFromForm(formData, "razao social") ||
      extractFromForm(formData, "beneficiaria") ||
      extractFromForm(formData, "entidade");
    if (nome) return removeAcentos(nome);
  }

  // Fallback: última parte do assunto separado por " - ", se parecer um nome
  if (assunto && assunto.includes(" - ")) {
    const parts = assunto.split(" - ");
    const last = parts[parts.length - 1].trim();
    if (last.length > 5) return removeAcentos(last);
  }

  return "";
}

/**
 * Extrai o CNPJ da Entidade Beneficiária do form_data.
 * Armazenado como string SOMENTE DE DÍGITOS (ex: "44543981000199")
 * para suportar busca por substring via ilike + índice pg_trgm,
 * sem dependência de formatação do usuário.
 */
export function extractSearchCnpj(formData: any[]): string {
  if (!Array.isArray(formData)) return "";

  const cnpj =
    extractFromForm(formData, "cnpj da unidade") ||
    extractFromForm(formData, "cnpj benefici") ||
    extractFromForm(formData, "cnpj");

  if (!cnpj) return "";

  // Remove formatação: "44.543.981/0001-99" → "44543981000199"
  return cnpj.replace(/[.\-\/]/g, "").trim();
}

/**
 * Parse agressivo para valores financeiros (Blindagem Total).
 * Lida com formatações BR (15.000,00), US (15,000.00), e "cascas de banana" (15.000 = quinze mil).
 */
export function extractSearchValorGlobal(valorCru: string | null | undefined): number {
  if (!valorCru) return 0;
  
  let limpo = String(valorCru).replace(/[^0-9,\.-]/g, "");
  if (!limpo) return 0;

  const isNegative = limpo.startsWith("-");
  limpo = limpo.replace(/-/g, "");

  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');

  if (ultimaVirgula > -1 && ultimoPonto > -1) {
    if (ultimaVirgula > ultimoPonto) {
      limpo = limpo.replace(/\./g, "").replace(",", ".");
    } else {
      limpo = limpo.replace(/,/g, "");
    }
  } else if (ultimaVirgula > -1) {
    const qtdeVirgulas = (limpo.match(/,/g) || []).length;
    const charsDepois = limpo.length - 1 - ultimaVirgula;

    if (qtdeVirgulas > 1) {
      if (charsDepois === 2) {
        const partes = limpo.split(',');
        const decimal = partes.pop();
        limpo = partes.join('') + '.' + decimal;
      } else {
        limpo = limpo.replace(/,/g, ""); 
      }
    } else {
      if (charsDepois === 3) {
        limpo = limpo.replace(",", ""); 
      } else {
        limpo = limpo.replace(",", "."); 
      }
    }
  } else if (ultimoPonto > -1) {
    const qtdePontos = (limpo.match(/\./g) || []).length;
    const charsDepois = limpo.length - 1 - ultimoPonto;

    if (qtdePontos > 1) {
      if (charsDepois === 2) {
        const partes = limpo.split('.');
        const decimal = partes.pop();
        limpo = partes.join('') + '.' + decimal;
      } else {
        limpo = limpo.replace(/\./g, ""); 
      }
    } else {
      if (charsDepois === 3) {
        limpo = limpo.replace(/\./g, ""); 
      } 
    }
  }

  const finalFloat = parseFloat(limpo);
  const resultado = isNaN(finalFloat) ? 0 : finalFloat;
  return isNegative ? -resultado : resultado;
}

/**
 * Função para Censura de Documentos Sensíveis (LGPD) com Anti-Falso Positivo
 */
export function isAnexoSensivel(filename: string | null | undefined): boolean {
  if (!filename) return false;

  // Normaliza o nome do arquivo (remove acentos, deixa em minúsculo)
  const limpo = removeAcentos(filename).toLowerCase();

  // Expressão Regular com Word Boundaries (\b) para a Blocklist Oficial Atualizada.
  // Evita falsos positivos como "comprovante_cpfl_energia.pdf"
  const regexSensivel = /\b(rg|cpf|cnh|obito|documento pessoal|identidade|carteira de trabalho|ctps|titulo de eleitor|passaporte|holerite|cns|cartao do sus|residencia|endereco|nascimento|casamento)\b/i;

  return regexSensivel.test(limpo);
}

/**
 * Calcula o valor total da emenda (suporta múltiplos autores via Rateio).
 * Fallback para somar campos "valor" do formulário principal se não houver Rateio.
 */
export function calculateTotalValorEmenda(
  formData: any[],
  conteudoSemHtml?: string
): number {
  if (!Array.isArray(formData)) return 0;

  // Tenta montar o rateio
  const rateios = buildRateioTable(formData, conteudoSemHtml);

  // Se houver rateio detectado (mesmo 1 autor), soma todos os valores (usando parseMoedaToNumber)
  if (rateios && rateios.length > 0) {
    let total = 0;
    for (const r of rateios) {
      total += parseMoedaToNumber(r.valor);
    }
    // Muitas vezes o Rateio tem autores, mas não tem valores (emendas conjuntas sem divisão prévia).
    // Se o total for maior que zero, retornamos o rateio. Se for 0, continuamos pro fallback.
    if (total > 0) return total;
  }

  // Fallback: extrai todos os campos numéricos de "valor" e soma (se não houver rateio detectado)
  const valorFields = formData.filter((f: any) => 
    f.label && (
      normalizeLabel(f.label).includes("valor global") || 
      normalizeLabel(f.label).includes("valor do repasse") ||
      normalizeLabel(f.label).includes("total programado") ||
      normalizeLabel(f.label) === "valor" ||
      normalizeLabel(f.label).includes("valor indicado") ||
      normalizeLabel(f.label).includes("valor disponibilizado")
    )
  );
  
  if (valorFields.length > 0) {
    return valorFields.reduce((sum: number, f: any) => sum + extractSearchValorGlobal(f.valor), 0);
  }

  return 0;
}
