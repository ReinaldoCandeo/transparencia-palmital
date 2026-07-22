import { unstable_cache } from "next/cache";

// ─── Interfaces do payload bruto da 1Doc ──────────────────────────────────

interface OnedocMovimentacao {
  id_emissao_evento: string | null;
  id_emissao?: string;
  tipo_movimentacao_str?: string;
  evento: string | null;
  data: string;
  hora: string;
  origem_id_setor: string;
  origem_setor: string;
  origem_id_usuario: string;
  origem_usuario: string; // recebido, mas omitido na saída pública (LGPD)
  anexos?: OnedocAnexo[];
}

interface OnedocAnexo {
  id_anexo: string;
  arquivo: string;      // nome completo do arquivo: "REQUIS_901.pdf"
  tamanho: string;      // tamanho em bytes como string
  tipo: string;         // MIME type: "application/pdf"
  url: string;          // URL direta — NUNCA exposta na saída pública
  url_original: string; // idem
}

interface OnedocProcesso {
  id_emissao?: string;
  num: number;           // número do processo (number na API)
  ano: number;           // ano do processo (number na API)
  num_formatado: string; // ex: "2.504/2026"
  assunto: string;
  conteudo: string;
  resumo?: string;
  data: string;
  hora: string;
  origem_id_setor: string;
  origem_setor: string;
  origem_usuario: string;
  destino_id_setor: string;
  destino_setor: string;
  situacao_atual_str: string;
  hash: string;
  id_assunto: number;    // presente na listagem — usado para filtragem pós-fetch
  total_despachos?: string;
  movimentacoes?: OnedocMovimentacao[];
  anexos?: OnedocAnexo[];
  // ── Campos do Formulário de Emenda Parlamentar (nomes obfuscados pela 1Doc) ──
  // Mapeamento confirmado via diagnóstico em 2026-07-15
  orgaopedido?: string;           // ORIGEM: '["Federal"]'
  orgaopedido_1hmg1t1h?: string;  // Nº LEI / PORTARIA: "10.436"
  divrequisitante?: string;       // FUNÇÃO LEGISLATIVA: '["Deputado"]'
  paciente_1hpjan1h?: string;     // Nº EMENDA / DEMANDA
  "4_1ha5rk1h"?: string;         // Nº PROPOSTA
  rg_1hvcln1h?: string;           // TIPO: '["Custeio"]'
  paciente_1hdyef1h?: string;     // BLOCO: '["302 - Média e Alta Complexidade"]'
  responsave_1hl4nm1h?: string;   // VALOR DISPONIBILIZADO: "100000.00"
  rg_1h5hxq1h?: string;           // EXERCÍCIO: "31/12/2026"
  cpf_1hui711h?: string;          // DADOS BANCÁRIOS (nome do banco)
  // 🚫 CAMPOS SENSÍVEIS — nunca incluir na saída pública (LGPD + Segurança)
  agencia_1hh0po1h?: string;      // AGÊNCIA — BLOQUEADO
  n_conta__1hmzl11h?: string;     // Nº CONTA — BLOQUEADO
}

interface OnedocPagina {
  num_pagina: number;
  total: number;         // total global de registros na 1Doc
  emissoes: OnedocProcesso[];
}

interface OnedocResponse {
  data: OnedocPagina[]; // data[0] contém a página
}

// ─── Interfaces públicas (sanitizadas) ───────────────────────────────────

export interface MovimentacaoPublica {
  id: string;
  evento: string;
  data: string;
  hora: string;
  origem_setor: string;
  anexos?: AnexoPublico[];
}

export interface AnexoPublico {
  arquivo: string;      // nome completo: "REQUIS_901.pdf"
  extensao: string;     // derivado: "pdf"
  tamanho_bytes: number;
  tipo_mime: string;    // "application/pdf"
}

/** Dados públicos da emenda parlamentar (agência e nº conta OMITIDOS por segurança) */
export interface EmendaInfo {
  origem: string;              // "Federal" | "Estadual" | "Municipal"
  lei_portaria: string;        // "10.436"
  funcao_legislativa: string;  // "Deputado" | "Senador" | ...
  num_emenda: string;          // "39380003"
  num_proposta: string;        // "36000758410202600"
  tipo: string;                // "Custeio" | "Investimento"
  bloco: string;               // "302 - Média e Alta Complexidade"
  valor_disponibilizado: string; // "R$ 100.000,00" (formatado)
  valor_raw: string;           // "100000.00" (para cálculos)
  exercicio: string;           // "31/12/2026"
  banco: string;               // "CAIXA ECONOMICA FEDERAL"
  justificativa: string;       // Texto limpo do campo conteudo (sem HTML, sem assinatura)
}

export interface EmendaSocialInfo {
  num_emenda:        string;  // orgaopedido_1hmg1t1h → "14/2025"
  ano:               string;  // orgaopedido           → "2025"
  objeto:            string;  // divrequisitante        → "Repasse de recursos p/ TEA..."
  origem:            string;  // 4_1ha5rk1h            → "Municipal"
  modalidade:        string;  // rg_1hvcln1h           → "Emenda Individual Impositiva"
  cnpj_concessor:    string;  // cpf_1hui711h           → "44.543.981/0001-99"
  cnpj_beneficiaria: string;  // rg_1h5hxq1h           → "49.893.795/0001-01"
  razao_social:      string;  // responsave_1hl4nm1h   → "ASSOC DE PAIS E AMIGOS..."
  
  // Feature Preventiva: Preparado para múltiplos autores e soma
  autores_repasses: {
    nome: string;
    valor: string;
  }[];
  valor_total: string;
}

export interface ProcessoPublico {
  hash: string;
  num: string;
  ano: string;
  num_formatado: string;
  id_assunto: number;
  assunto: string;
  data: string;
  hora: string;
  origem_setor: string;
  destino_setor: string;
  situacao_atual_str: string;
  movimentacoes: MovimentacaoPublica[];
  anexos: AnexoPublico[];
  emenda?: EmendaInfo;          // Saúde (1915747) — mantida intacta
  emenda_social?: EmendaSocialInfo; // Social (1915739, 1915740)
}

// ─── Configuração ──────────────────────────────────────────────────────────

function getConfig(): { baseUrl: string; authHash: string } {
  const baseUrl = process.env.ONEDOC_BASE_URL;
  const authHash = process.env.ONEDOC_AUTH_HASH;
  if (!baseUrl || !authHash) {
    throw new Error(
      "Variáveis de ambiente ONEDOC_BASE_URL e ONEDOC_AUTH_HASH são obrigatórias"
    );
  }
  return { baseUrl, authHash };
}

// ─── Sanitização ──────────────────────────────────────────────────────────

/**
 * Extrai texto puro do HTML da 1Doc, removendo:
 * - O bloco <div class="emissao_assinatura"> (contém nome de funcionário — LGPD)
 * - Todas as demais tags HTML
 */
function stripHtml(html: string): string {
  // Remove bloco de assinatura interna (LGPD: contém nome do servidor)
  const semAssinatura = html.replace(
    /<div[^>]*class=["'][^"']*emissao_assinatura[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    ""
  );
  // Substitui <br> por espaço, remove demais tags
  return semAssinatura
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Deserializa campos select da 1Doc: '["Federal"]' → "Federal" */
function parseSelect(valor: string | undefined): string {
  if (!valor) return "";
  try {
    const arr = JSON.parse(valor);
    if (Array.isArray(arr)) return arr.join(", ");
  } catch {
    // não é JSON — retorna o valor bruto
  }
  return valor;
}

/** Formata valor decimal da 1Doc para moeda BRL.
 * A 1Doc salva campos 'decimal' no formato brasileiro: "100.000,00"
 * (ponto = milhar, vírgula = decimal). parseFloat nativo não entende isso.
 */
function formatarMoeda(valor: string | undefined): string {
  if (!valor) return "";
  const str = String(valor).trim();
  // Detecta formato brasileiro: "100.000,00" ou "1.000,00" ou "500,00"
  const isBrazilian = /^\d{1,3}(\.\d{3})*,\d{2}$/.test(str);
  let num: number;
  if (isBrazilian) {
    // Remove pontos de milhar e troca vírgula decimal por ponto
    num = parseFloat(str.replace(/\./g, "").replace(",", "."));
  } else {
    // Assume formato inglês: "100000.00"
    num = parseFloat(str);
  }
  if (isNaN(num)) return str;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

/** Converte data ISO ("2026-12-31") para formato brasileiro ("31/12/2026").
 * Se já estiver em DD/MM/AAAA, retorna como está.
 */
function formatarDataBR(valor: string | undefined): string {
  if (!valor) return "";
  // ISO: AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return valor; // já em DD/MM/AAAA ou outro formato
}

/**
 * Extrai e sanitiza os dados do Formulário de Emenda Parlamentar.
 * Bloqueia explicitamente agência e nº de conta (dados bancários sensíveis).
 */
function extrairEmenda(p: OnedocProcesso): EmendaInfo | undefined {
  // Só extrai se for um processo de emenda parlamentar
  if (!p.orgaopedido && !p.paciente_1hpjan1h) return undefined;

  const valorRaw = p.responsave_1hl4nm1h ?? "";

  return {
    origem: parseSelect(p.orgaopedido),
    lei_portaria: p.orgaopedido_1hmg1t1h ?? "",
    funcao_legislativa: parseSelect(p.divrequisitante),
    num_emenda: p.paciente_1hpjan1h ?? "",
    num_proposta: p["4_1ha5rk1h"] ?? "",
    tipo: parseSelect(p.rg_1hvcln1h),
    bloco: parseSelect(p.paciente_1hdyef1h),
    valor_disponibilizado: formatarMoeda(valorRaw),
    valor_raw: valorRaw,
    exercicio: formatarDataBR(p.rg_1h5hxq1h),
    banco: p.cpf_1hui711h ?? "",
    // ✅ Justificativa: conteudo limpo de HTML e assinatura interna
    justificativa: stripHtml(p.conteudo ?? ""),
    // 🚫 agencia_1hh0po1h e n_conta__1hmzl11h: NUNCA incluídos aqui
  };
}

const ASSUNTOS_SOCIAL = new Set([1915739, 1915740]);

function isSocial(p: OnedocProcesso): boolean {
  // 1. Tenta por ID ou texto do assunto se estiverem perfeitamente classificados
  if (p.id_assunto && ASSUNTOS_SOCIAL.has(Number(p.id_assunto))) return true;
  if (p.assunto && p.assunto.toLowerCase().includes("terceiro setor")) return true;

  // 2. Heurística de Conteúdo (Solução Arquitetural Padrão para API /despachos)
  // O campo 'rg_1h5hxq1h' armazena o "Exercício" (Saúde, ~4 dígitos) ou "CNPJ Beneficiária" (Social)
  const rgValue = stripHtml(p.rg_1h5hxq1h ?? "").trim();
  if (rgValue.length > 10 && rgValue.includes("/")) {
    return true; // Contém barra e tem tamanho compatível com CNPJ
  }

  // O campo 'cpf_1hui711h' armazena "Banco" (Saúde, Texto) ou "CNPJ Concessor" (Social)
  const cpfValue = stripHtml(p.cpf_1hui711h ?? "").trim();
  if (cpfValue.length > 10 && /^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/.test(cpfValue)) {
    return true; // Match exato com regex de CNPJ formatado
  }

  return false;
}

function extrairEmendaSocial(p: OnedocProcesso): EmendaSocialInfo | undefined {
  if (!isSocial(p)) return undefined;
  if (!p.responsave_1hl4nm1h && !p.paciente_1hpjan1h) return undefined;

  const valorFormatado = formatarMoeda(p.paciente_1hdyef1h);
  
  return {
    num_emenda:        stripHtml(p.orgaopedido_1hmg1t1h ?? ""),
    ano:               stripHtml(p.orgaopedido ?? ""),
    objeto:            stripHtml(p.divrequisitante ?? ""),
    origem:            stripHtml((p as any)["4_1ha5rk1h"] ?? ""),  // campo com nome em dígito
    modalidade:        stripHtml(p.rg_1hvcln1h ?? ""),
    cnpj_concessor:    stripHtml(p.cpf_1hui711h ?? ""),
    cnpj_beneficiaria: stripHtml(p.rg_1h5hxq1h ?? ""),
    razao_social:      stripHtml(p.responsave_1hl4nm1h ?? ""),
    
    // Mock preventivo: mapeia o único autor que a API retorna hoje
    autores_repasses: [{
      nome: stripHtml(p.paciente_1hpjan1h ?? ""),
      valor: valorFormatado
    }],
    valor_total: valorFormatado,
  };
}

function sanitizarProcesso(p: OnedocProcesso): ProcessoPublico {
  const processoSocial = isSocial(p);

  return {
    hash: p.hash,
    num: String(p.num),
    ano: String(p.ano),
    num_formatado: p.num_formatado,
    id_assunto: p.id_assunto,
    assunto: stripHtml(p.assunto ?? ""),
    data: p.data,
    hora: p.hora,
    origem_setor: p.origem_setor,
    destino_setor: p.destino_setor,
    situacao_atual_str: p.situacao_atual_str,
    emenda: processoSocial ? undefined : extrairEmenda(p),
    emenda_social: processoSocial ? extrairEmendaSocial(p) : undefined,
    movimentacoes: (p.movimentacoes ?? [])
      .filter((m) => m.data && m.data !== "0000-00-00")
      .map((m) => ({
        id: m.id_emissao_evento ?? m.id_emissao ?? `${m.data}-${m.hora}`,
        evento: m.evento ?? m.tipo_movimentacao_str ?? "Despacho",
        data: m.data,
        hora: m.hora,
        origem_setor: m.origem_setor ?? "",
        anexos: (m.anexos ?? []).map((a) => {
          const partes = a.arquivo.split(".");
          const extensao = partes.length > 1 ? (partes.pop() ?? "") : "";
          return {
            arquivo: a.arquivo,
            extensao: extensao.toLowerCase(),
            tamanho_bytes: Number(a.tamanho),
            tipo_mime: a.tipo,
          };
        }),
      })),
    anexos: (p.anexos ?? []).map((a) => {
      const partes = a.arquivo.split(".");
      const extensao = partes.length > 1 ? (partes.pop() ?? "") : "";
      return {
        arquivo: a.arquivo,
        extensao: extensao.toLowerCase(),
        tamanho_bytes: Number(a.tamanho),
        tipo_mime: a.tipo,
      };
    }),
  };
}

// ─── Paginação SSR (Server-Side) ──────────────────────────────────────────

export interface PaginaResult {
  processos: ProcessoPublico[];
  paginaAtual: number;
  totalPaginas: number;
}

export async function obterProcessosPaginadoInterno(
  pagina: number
): Promise<PaginaResult> {
  try {
    const { baseUrl, authHash } = getConfig();
    
    let url = `${baseUrl}/processos-administrativos?pagina=${pagina}`;
    // A API da 1Doc rejeita os parâmetros 'ano' e 'mes' com erro 400.
    // Se quisermos filtrar por ano/mês no frontend, teríamos que filtrar em memória.

    const res = await fetch(url, {
      headers: { "X-Auth-Hash": authHash },
    });

    if (!res.ok) {
      console.error(`[1Doc] Erro ${res.status} ao consultar API na URL ${url}`);
      return { processos: [], paginaAtual: pagina, totalPaginas: 1 };
    }

    const json: OnedocResponse = await res.json();
    const paginaDados = json.data?.[0];

    if (!paginaDados || !Array.isArray(paginaDados.emissoes)) {
      return { processos: [], paginaAtual: pagina, totalPaginas: 1 };
    }

    const ASSUNTOS_EMENDA = new Set([
      1915747, // MAC - Emenda Federal - Saúde
      1915739, // Terceiro Setor - Emenda Municipais - Social
      1915740, // Terceiro Setor - Emenda Parlamentar Estadual/Federal - Social
    ]);

    const processos = paginaDados.emissoes
      .filter((p) => ASSUNTOS_EMENDA.has(p.id_assunto))
      .map(sanitizarProcesso);
    // A API retorna 20 itens por página (corrigido de 15)
    const totalPaginas = Math.ceil((paginaDados.total || 0) / 20) || 1;

    return { processos, paginaAtual: pagina, totalPaginas };
  } catch (err) {
    console.error("[1Doc] Falha na paginação:", err);
    return { processos: [], paginaAtual: pagina, totalPaginas: 1 };
  }
}

// ─── Busca Exata por Número e Ano (Proxy Direct Search) ───────────────────

async function obterHashPorNumeroInterno(
  numero: string,
  ano: string
): Promise<string | null> {
  try {
    const { baseUrl, authHash } = getConfig();
    // Endpoint documentado no Swagger da 1Doc
    const url = `${baseUrl}/processos-administrativos/busca-por-numero?numero=${numero}&ano=${ano}`;
    
    const res = await fetch(url, {
      headers: { "X-Auth-Hash": authHash },
    });

    if (!res.ok) {
      console.error(`[1Doc] Erro ${res.status} ao buscar número exato: ${url}`);
      return null;
    }

    const json = await res.json();
    
    // A 1Doc pode retornar um objeto direto ou dentro de um array `data`
    const processo = json.data?.[0] || json;
    if (processo && processo.hash) {
      return processo.hash;
    }
    
    return null;
  } catch (err) {
    console.error(`[1Doc] Falha ao buscar numero ${numero}/${ano}:`, err);
    return null;
  }
}

// ─── Detalhes do Processo ─────────────────────────────────────────────────

interface OnedocDetalheResponse {
  data: OnedocProcesso[];
}

export async function obterDetalheInterno(hash: string): Promise<ProcessoPublico | null> {
  try {
    const { baseUrl, authHash } = getConfig();

    const res = await fetch(
      `${baseUrl}/processos-administrativos/${hash}/despachos?pagina=1`,
      {
        headers: { "X-Auth-Hash": authHash },
      }
    );

    if (!res.ok) return null;

    const json: OnedocDetalheResponse = await res.json();
    const processo = json.data?.[0] ?? null;
    if (!processo) return null;

    // ── FASE 1 - MAPEAMENTO: Inspeciona o campo `conteudo` bruto ──────────
    // Logs de diagnóstico removidos (LGPD / Segurança)
    // ────────────────────────────────────────────────────────────────────────

    return sanitizarProcesso(processo);
  } catch (err) {
    console.error(`[1Doc] Falha ao buscar detalhe ${hash}:`, err);
    return null;
  }
}

// ─── Exportações com Cache (Escopo Global para Evitar Memory Leaks) ───────

export const buscarProcessosPaginado = unstable_cache(
  async (pagina: number) => 
    obterProcessosPaginadoInterno(pagina),
  ["processos-paginados"],
  { revalidate: 300, tags: ["processos"] }
);

export const buscarDetalhe = unstable_cache(
  async (hash: string) => obterDetalheInterno(hash),
  ["processo-detalhe"],
  { revalidate: 300 }
);

export const buscarHashPorNumero = unstable_cache(
  async (numero: string, ano: string) => obterHashPorNumeroInterno(numero, ano),
  ["processo-hash-numero"],
  { revalidate: 300 }
);
