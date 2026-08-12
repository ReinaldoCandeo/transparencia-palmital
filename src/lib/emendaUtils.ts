/**
 * Remove acentos, espaços extras, indicadores ordinais (º/ª) e pontuação,
 * coloca em minúsculo — garante que "Nº" → "no", "Esféra" → "esfera".
 */
export function normalizeLabel(label: string): string {
  if (!label) return "";
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos combinados (NFD)
    .replace(/\u00BA/g, "o")         // º (ordinal masc.) → o  (ex: "Nº" → "No")
    .replace(/\u00AA/g, "a")         // ª (ordinal fem.)  → a
    .replace(/[/:.,;]/g, " ")        // Pontuação → espaço  (ex: "BANCÁRIOS:" → "BANCARIOS ")
    .replace(/\s{2,}/g, " ")         // Colapsa espaços múltiplos
    .toLowerCase()
    .trim();
}

/**
 * Extrai de forma segura o valor de uma label específica no array form_data.
 * Ignora maiúsculas e acentos usando o normalizeLabel.
 */
export function extractFromForm(formData: any[], targetLabelNormalized: string): string | null {
  if (!Array.isArray(formData)) return null;
  
  const found = formData.find(item => {
    if (!item.label) return false;
    return normalizeLabel(item.label).includes(targetLabelNormalized);
  });
  
  if (!found) return null;

  let val = found.valor;
  if (!val) return null;

  // Lida com campos que chegam como arrays de string (ex: '["Federal"]')
  if (val.startsWith("[") && val.endsWith("]")) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      // Falhou o parse, usa string pura
    }
  }
  return val;
}

export interface RateioEmenda {
  emenda: string;
  autor: string;
  valor: string;
}

/** 
 * Converte string de moeda BR para número.
 * Lida com: "R$ 3.700,00", "2.000,00", "5000", etc.
 */
export function parseMoedaToNumber(valor: string | null | undefined): number {
  if (!valor) return 0;
  const limpo = valor
    .replace(/R\$/g, "")
    .replace(/[^\d,\.]/g, "")  // Remove tudo exceto dígitos, ponto e vírgula
    .trim();

  // Formato BR: "3.700,00" (ponto = milhar, vírgula = decimal)
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(limpo)) {
    const num = parseFloat(limpo.replace(/\./g, "").replace(",", "."));
    return isNaN(num) ? 0 : num;
  }

  // Sem separador de milhar: "2000,00" ou "2000.00"
  const num = parseFloat(limpo.replace(",", "."));
  return isNaN(num) ? 0 : num;
}

/**
 * Formata número para moeda BRL: 5700 → "R$ 5.700,00"
 */
export function formatMoedaBR(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

/** 
 * Função crítica de Rateio (Expressão Regular)
 * Extrai o rateio injetado pelos servidores no campo de texto livre.
 * Padrão: "Nº da Emenda: 11/2025 ; Vereador Autor: Marcelo... ; Valor: 5.000,00"
 */
export function extractRateioAutores(conteudoSemHtml: string): RateioEmenda[] {
  if (!conteudoSemHtml) return [];
  const autores: RateioEmenda[] = [];
  
  // 1. Tenta o padrão novo: "50410001/2026 - Bruno Henrique - R$ 10.000,00;"
  // Captura global buscando (Emenda) - (Autor) - (Valor) seguido de ; ou \n ou final da string
  const regexNovo = /([a-zA-Z0-9./]+)\s*-\s*([a-zA-ZÀ-ÿ\s]+?)\s*-\s*(R\$?\s*[\d.,]+)(?=[;\n]|$)/g;
  
  let match;
  let encontrouNovo = false;
  
  while ((match = regexNovo.exec(conteudoSemHtml)) !== null) {
    encontrouNovo = true;
    autores.push({
      emenda: match[1].trim(),
      autor: match[2].trim(),
      valor: match[3].trim()
    });
  }

  // 2. Fallback: Se não encontrou nenhum padrão novo, roda a regex legada
  if (!encontrouNovo) {
    const regexLegado = /Nº da Emenda:\s*(.*?)\s*;\s*Vereador Autor:\s*(.*?)\s*;\s*Valor:\s*(.*?)(?=\n|$)/g;
    while ((match = regexLegado.exec(conteudoSemHtml)) !== null) {
      autores.push({
        emenda: match[1].trim(),
        autor: match[2].trim(),
        valor: match[3].trim()
      });
    }
  }
  
  return autores;
}

/**
 * Constrói a tabela de rateio unificada, combinando o Autor Principal
 * (extraído do form_data) com os Autores Secundários (extraídos via Regex do texto livre).
 * 
 * O Autor Principal sempre aparece no TOPO da tabela.
 * Evita duplicatas: se o Autor Principal já aparece no resultado da Regex, não o adiciona.
 */
export function buildRateioTable(
  formData: any[],
  conteudoSemHtml: string | undefined
): RateioEmenda[] {
  // 1. Tenta montar o Autor Principal a partir do form_data
  // Busca variações comuns de nomenclaturas
  const nomeAutor =
    extractFromForm(formData, "vereador autor") ||
    extractFromForm(formData, "parlamentar autor") ||
    extractFromForm(formData, "autor") ||
    extractFromForm(formData, "vereador") ||
    null;
  
  const numEmenda = extractFromForm(formData, "no da emenda") || extractFromForm(formData, "n. da emenda") || extractFromForm(formData, "emenda") || "";
  const valorPrincipal = extractFromForm(formData, "valor") || extractFromForm(formData, "total programado") || "";

  // 2. Extrai autores secundários via Regex do texto livre
  const autoresSecundarios = extractRateioAutores(conteudoSemHtml || "");

  // 3. Monta o objeto do Autor Principal (se existir)
  let autorPrincipal: RateioEmenda | null = null;
  if (nomeAutor) {
    // Verifica se o Autor Principal já está nos secundários (evita duplicata)
    const jaExiste = autoresSecundarios.some(
      (a) => normalizeLabel(a.autor).includes(normalizeLabel(nomeAutor))
    );
    if (!jaExiste) {
      autorPrincipal = {
        emenda: numEmenda,
        autor: nomeAutor,
        valor: valorPrincipal,
      };
    }
  }

  // 4. Combina: Autor Principal no topo + Autores Secundários
  return autorPrincipal ? [autorPrincipal, ...autoresSecundarios] : autoresSecundarios;
}
