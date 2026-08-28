import { unstable_cache } from "next/cache";
import { z } from "zod";
import { isAnexoSensivel } from "./search-extractors";
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
  conteudo?: string;
}

interface OnedocAnexo {
  id_anexo: string;
  arquivo: string;      // nome completo do arquivo: "REQUIS_901.pdf"
  tamanho: string;      // tamanho em bytes como string
  tipo: string;         // MIME type: "application/pdf"
  url: string;          // URL direta — NUNCA exposta na saída pública
  url_original: string; // idem
}

export const OnedocProcessoSchema = z.object({
  id_emissao: z.string().optional(),
  id_emissao_base: z.string().optional(),
  id_emissao_pai: z.string().optional(),
  num: z.coerce.number(),
  ano: z.coerce.number(),
  num_formatado: z.string().optional(),
  assunto: z.string().optional(),
  conteudo: z.string().optional(),
  resumo: z.string().optional(),
  data: z.string().optional(),
  hora: z.string().optional(),
  origem_id_setor: z.string().optional(),
  origem_setor: z.string().optional(),
  origem_usuario: z.string().optional(),
  destino_id_setor: z.string().optional(),
  destino_setor: z.string().optional(),
  situacao_atual_str: z.string().optional(),
  hash: z.string(),
  id_assunto: z.coerce.number(), // ✅ Coerção na fronteira!
  total_despachos: z.coerce.number().optional(),
  movimentacoes: z.array(z.any()).optional(),
  anexos: z.array(z.any()).optional(),
  // Campos do Formulário
  orgaopedido: z.string().nullable().optional(),
  orgaopedido_1hmg1t1h: z.string().nullable().optional(),
  divrequisitante: z.string().nullable().optional(),
  paciente_1hpjan1h: z.string().nullable().optional(),
  "4_1ha5rk1h": z.string().nullable().optional(),
  rg_1hvcln1h: z.string().nullable().optional(),
  paciente_1hdyef1h: z.string().nullable().optional(),
  responsave_1hl4nm1h: z.string().nullable().optional(),
  rg_1h5hxq1h: z.string().nullable().optional(),
  cpf_1hui711h: z.string().nullable().optional(),
  agencia_1hh0po1h: z.string().nullable().optional(),
  n_conta__1hmzl11h: z.string().nullable().optional(),
}).passthrough();

export type OnedocProcesso = z.infer<typeof OnedocProcessoSchema>;

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
  conteudo?: string;
}

export interface AnexoPublico {
  id_externo?: string;  // id original da 1doc
  arquivo: string;      // nome completo: "REQUIS_901.pdf"
  extensao: string;     // derivado: "pdf"
  tamanho_bytes: number;
  tipo_mime: string;    // "application/pdf"
  url_storage?: string | null; // URL pública do Supabase Storage
  _url_original?: string; // Temporário durante o sync, não usar no frontend!
}

export interface ProcessoPublico {
  id_emissao: string;
  id_emissao_base?: string;
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
  
  // JSONB flexível para formulários
  form_data: { label: string; valor: string; tipo?: string }[];
  conteudo?: string;
  processos_vinculados_hashes: string[]; // Hashes extraídos via HTML
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

/**
 * Remove apenas o bloco de assinatura interna para LGPD, 
 * mas mantém a formatação HTML para exibição na UI.
 */
function cleanHtml(html: string): string {
  if (!html) return "";
  return html.replace(
    /<div[^>]*class=["'][^"']*emissao_assinatura[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    ""
  ).trim();
}

/** Deserializa campos select da 1Doc: '["Federal"]' → "Federal" */
function parseSelect(valor: string | null | undefined): string {
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
function formatarMoeda(valor: string | null | undefined): string {
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

/** 
 * Higienização estrita de string de moeda BRL para Float.
 * Remove 'R$', espaços, pontos de milhar e converte vírgula decimal para ponto.
 */
function parseMoedaToFloat(valor: string | null | undefined): number {
  if (!valor) return 0;
  const limpo = valor
    .replace(/R\$/g, "")
    .replace(/[\s\u00A0\u202F]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const floatVal = parseFloat(limpo);
  return isNaN(floatVal) ? 0 : floatVal;
}

/** Converte data ISO ("2026-12-31") para formato brasileiro ("31/12/2026").
 * Se já estiver em DD/MM/AAAA, retorna como está.
 */
function formatarDataBR(valor: string | null | undefined): string {
  if (!valor) return "";
  // ISO: AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return valor; // já em DD/MM/AAAA ou outro formato
}

/**
 * Extrai dinamicamente todos os dados de formulário definidos pela 1Doc
 * a partir de emissao_campos_adicionais_assunto.
 */
function extrairFormData(p: OnedocProcesso): { label: string; valor: string; tipo?: string }[] {
  const camposAdicionaisStr = (p as any).emissao_campos_adicionais_assunto;
  const formData: { label: string; valor: string; tipo?: string }[] = [];
  
  if (camposAdicionaisStr) {
    try {
      const camposDefinidos = JSON.parse(camposAdicionaisStr);
      for (const def of camposDefinidos) {
        if (!def.campo || !def.label) continue;
        
        const labelStr = stripHtml(def.label);
        if (!labelStr) continue; // Pula labels vazias
        
        const valorCru = (p as any)[def.campo];
        if ((valorCru === undefined || valorCru === null || valorCru === "") && !def.tipo?.startsWith("titulo")) continue;

        let valorFormatado = stripHtml(String(valorCru || ""));
        
        // Formatação baseada no tipo ou conteúdo
        if (def.tipo === "text" && valorFormatado.match(/^\d{1,3}(\.\d{3})*,\d{2}$/)) {
          valorFormatado = formatarMoeda(valorFormatado);
        }

        formData.push({
          label: labelStr,
          valor: valorFormatado,
          tipo: def.tipo
        });
      }
    } catch (err) {
      console.error(
        `[1Doc] JSON inválido em emissao_campos_adicionais_assunto`,
        `| hash: ${p.hash}`,
        `| erro: ${err instanceof Error ? err.message : String(err)}`,
        `| payload (truncado): ${String(camposAdicionaisStr).slice(0, 200)}`
      );
    }
  }

  // NOVA DIRETRIZ: Extração Bancária (Etapa 8) - Leitura estruturada das movimentações
  if (p.movimentacoes && p.movimentacoes.length > 0) {
    for (const mov of p.movimentacoes) {
      const nomeEtapa = String(mov.nome_etapa || mov.evento || mov.tipo_movimentacao_str || "").toLowerCase();
      // Detecta se a movimentação é o trâmite da Etapa 8 (Empenho/Banco)
      if (nomeEtapa.includes("etapa 8") || nomeEtapa.includes("empenho")) {
        const camposMovStr = mov.emissao_campos_adicionais_assunto;
        if (camposMovStr) {
          try {
            const camposMov = JSON.parse(camposMovStr);
            for (const def of camposMov) {
              if (!def.campo || !def.label) continue;
              const labelStr = stripHtml(def.label);
              if (!labelStr) continue;
              
              const labelNorm = labelStr.toLowerCase();
              // Extrair apenas os dados bancários (Banco, Agência, Conta)
              if (labelNorm.includes("banco") || labelNorm.includes("agencia") || labelNorm.includes("agência") || labelNorm.includes("conta")) {
                const valorCru = mov[def.campo];
                if (valorCru !== undefined && valorCru !== null && valorCru !== "") {
                  formData.push({
                    label: labelStr,
                    valor: stripHtml(String(valorCru)),
                    tipo: def.tipo
                  });
                }
              }
            }
          } catch (e) {
            console.warn(`[1Doc] JSON inválido na movimentação da Etapa 8. Hash: ${p.hash}`);
          }
        }
      }
    }
  }

  return formData;
}

// ─── Grupos Semânticos de Assuntos ─────────────────────────────────────────
// Fonte única de verdade para toda a regra de negócio do portal.
// As definições foram movidas para `assuntos.ts` para evitar importação circular.

import {
  ASSUNTOS_SAUDE,
  ASSUNTOS_OBRAS,
  ASSUNTOS_AGRICULTURA,
  ASSUNTOS_EDUCACAO,
  ASSUNTOS_TERCEIRO_SETOR,
  ASSUNTOS_EMENDA,
} from "./assuntos";

export {
  ASSUNTOS_SAUDE,
  ASSUNTOS_OBRAS,
  ASSUNTOS_AGRICULTURA,
  ASSUNTOS_EDUCACAO,
  ASSUNTOS_TERCEIRO_SETOR,
  ASSUNTOS_EMENDA,
};


export function extractVinculadosHashesFromHtml(html: string): string[] {
  if (!html) return [];
  // A API da 1Doc pode enviar links no formato: href="...?hash=476AA5BA439BB..."
  // ou com html entities href="...&amp;hash=476AA5BA..."
  // ou através de atributos data-hash="...". Esta regex captura todas as formas.
  const regex = /(?:data-hash=["']|[\?&]hash=|&amp;hash=)([a-fA-F0-9]{24})(?:["'&]|&amp;)/gi;
  const hashes = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) hashes.add(match[1].toUpperCase());
  }
  return Array.from(hashes);
}

function calcularStatusSemantico(situacaoOriginal: string, movimentacoes: any[]): string {
  if (!movimentacoes || movimentacoes.length === 0) return "Em Formalização";
  
  // Extrai todas as descrições de etapas em lower case para busca semântica
  const etapas = movimentacoes.map(m => String(m.nome_etapa || m.evento || m.tipo_movimentacao_str || "").toLowerCase());

  // Ordem de precedência: de trás para frente no funil
  if (etapas.some(e => e.includes("etapa 14"))) return "Concluído (AUDESP)";
  if (etapas.some(e => e.includes("etapa 11") || e.includes("etapa 12") || e.includes("etapa 13"))) return "Em Prestação de Contas";
  if (etapas.some(e => e.includes("etapa 10") || e.includes("execução") || e.includes("execucao"))) return "Em Execução";
  
  // Se não chegou nas etapas de execução/prestação de contas, está em fase inicial
  return "Em Formalização";
}

function sanitizarProcesso(p: OnedocProcesso): ProcessoPublico {
  const processos_vinculados_hashes: string[] = [];
  try {
    if (p.movimentacoes) {
      for (const mov of p.movimentacoes) {
        if (mov.conteudo) {
          processos_vinculados_hashes.push(...extractVinculadosHashesFromHtml(mov.conteudo));
        }
      }
    }
  } catch (err) {
    console.error("[1Doc] Erro silencioso no sanitizarProcesso (vinculados):", err);
  }

  // Remove hashes duplicados
  const hashesUnicos = Array.from(new Set(processos_vinculados_hashes));

  return {
    id_emissao: p.id_emissao || "",
    id_emissao_base: (p.id_emissao_pai && p.id_emissao_pai !== "0") ? p.id_emissao_pai : (p.id_emissao_base || undefined),
    hash: p.hash,
    num: String(p.num),
    ano: String(p.ano),
    num_formatado: p.num_formatado || `${p.num.toLocaleString("pt-BR")}/${p.ano}`,
    id_assunto: p.id_assunto,
    assunto: stripHtml(p.assunto ?? ""),
    conteudo: p.conteudo ? cleanHtml(p.conteudo) : undefined,
    data: p.data ?? "",
    hora: p.hora ?? "",
    origem_setor: p.origem_setor ?? "",
    destino_setor: p.destino_setor ?? "",
    situacao_atual_str: calcularStatusSemantico(p.situacao_atual_str ?? "", p.movimentacoes ?? []),
    
    // Novo fluxo universal de formulário
    form_data: extrairFormData(p),

    movimentacoes: (p.movimentacoes ?? [])
      .filter((m) => m.data && m.data !== "0000-00-00")
      .map((m) => ({
        id: m.id_emissao_evento ?? m.id_emissao ?? `${m.data}-${m.hora}`,
        evento: m.evento ?? m.tipo_movimentacao_str ?? "Despacho",
        data: m.data,
        hora: m.hora,
        origem_setor: m.origem_setor ?? "",
        conteudo: m.conteudo ? cleanHtml(m.conteudo) : undefined,
        anexos: (m.anexos ?? [])
          .filter((a: any) => !isAnexoSensivel(a.arquivo))
          .map((a: any) => {
          const partes = a.arquivo.split(".");
          const extensao = partes.length > 1 ? (partes.pop() ?? "") : "";
          return {
            id_externo: a.id_anexo,
            arquivo: a.arquivo,
            extensao: extensao.toLowerCase(),
            tamanho_bytes: Number(a.tamanho),
            tipo_mime: a.tipo,
            _url_original: a.url_original,
          };
        }),
      })),
    anexos: (p.anexos ?? [])
      .filter((a: any) => !isAnexoSensivel(a.arquivo))
      .map((a) => {
      const partes = a.arquivo.split(".");
      const extensao = partes.length > 1 ? (partes.pop() ?? "") : "";
      return {
        id_externo: a.id_anexo,
        arquivo: a.arquivo,
        extensao: extensao.toLowerCase(),
        tamanho_bytes: Number(a.tamanho),
        tipo_mime: a.tipo,
        _url_original: a.url_original,
      };
    }),
    processos_vinculados_hashes: hashesUnicos,
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

    // Boundary Validation
    const emissoesValidadas = z.array(OnedocProcessoSchema).parse(paginaDados.emissoes);

    const processos = emissoesValidadas
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

export async function obterHashPorNumeroInterno(
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
    const processo = json.data?.[0]?.emissao || json.data?.[0] || json;
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

const DESPACHOS_POR_PAGINA = 20;
const MAX_PAGINAS_DETALHE = 10;

export async function obterDetalheInterno(hash: string): Promise<ProcessoPublico | null> {
  try {
    const { baseUrl, authHash } = getConfig();

    // ── FASE 1: Busca página 1 (processo base)
    const res = await fetch(
      `${baseUrl}/processos-administrativos/${hash}/despachos?pagina=1`,
      {
        headers: { "X-Auth-Hash": authHash },
      }
    );

    if (!res.ok) {
      console.error(`[1Doc] Detalhe ${hash}: HTTP ${res.status} ${res.statusText}`);
      return null;
    }

    const json: OnedocDetalheResponse = await res.json();
    const processoBase = json.data?.[0] ?? null;
    if (!processoBase) {
      console.warn(`[1Doc] Detalhe ${hash}: API retornou data vazio (processo sem despachos ou recém-criado)`);
      return null;
    }

    const totalDespachos = processoBase.total_despachos ?? 0;
    const totalPaginasCalculado = Math.ceil(totalDespachos / DESPACHOS_POR_PAGINA);
    const totalPaginas = Math.min(totalPaginasCalculado, MAX_PAGINAS_DETALHE);

    // ── FASE 2: Busca páginas adicionais (se existirem)
    if (totalPaginas > 1) {
      for (let N = 2; N <= totalPaginas; N++) {
        try {
          console.log(`[1Doc] Detalhe ${hash}: carregando página ${N}/${totalPaginas}`);
          const resPagina = await fetch(
            `${baseUrl}/processos-administrativos/${hash}/despachos?pagina=${N}`,
            {
              headers: { "X-Auth-Hash": authHash },
              signal: AbortSignal.timeout(15000)
            }
          );
          
          if (resPagina.ok) {
            const jsonPagina: OnedocDetalheResponse = await resPagina.json();
            const processoN = jsonPagina.data?.[0];
            if (processoN?.movimentacoes) {
              if (!processoBase.movimentacoes) {
                processoBase.movimentacoes = [];
              }
              processoBase.movimentacoes.push(...processoN.movimentacoes);
            }
          } else {
             console.warn(`[1Doc] Detalhe ${hash}: falha ao carregar página ${N} (HTTP ${resPagina.status}). Ignorando.`);
          }
        } catch (errPagina) {
          console.error(`[1Doc] Detalhe ${hash}: falha ao carregar página ${N}`, errPagina);
        }
      }
    }

    // ── FASE 3: Deduplicação e sanitização
    if (processoBase.movimentacoes && processoBase.movimentacoes.length > 0) {
      const uniqueMovs = new Map();
      let fallbackCounter = 0;
      for (const mov of processoBase.movimentacoes) {
        const key = mov.id_emissao_evento || `fallback_${fallbackCounter++}`;
        uniqueMovs.set(key, mov);
      }
      (processoBase as any).movimentacoes = Array.from(uniqueMovs.values());
    }

    // ── FASE 4 - MAPEAMENTO: Inspeciona o campo `conteudo` bruto ──────────
    // Logs de diagnóstico removidos (LGPD / Segurança)
    // ────────────────────────────────────────────────────────────────────────

    // Boundary Validation
    const processoSanitizado = OnedocProcessoSchema.parse(processoBase);

    return sanitizarProcesso(processoSanitizado);
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
