import { unstable_cache } from "next/cache";
import { SETORES_PERMITIDOS } from "@/config/setores";
import fs from "fs";
import path from "path";

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
  total_despachos?: string;
  movimentacoes?: OnedocMovimentacao[];
  anexos?: OnedocAnexo[];
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
}

export interface AnexoPublico {
  arquivo: string;      // nome completo: "REQUIS_901.pdf"
  extensao: string;     // derivado: "pdf"
  tamanho_bytes: number;
  tipo_mime: string;    // "application/pdf"
}

export interface ProcessoPublico {
  hash: string;
  num: string;
  ano: string;
  num_formatado: string;
  assunto: string;
  data: string;
  hora: string;
  origem_setor: string;
  destino_setor: string;
  situacao_atual_str: string;
  movimentacoes: MovimentacaoPublica[];
  anexos: AnexoPublico[];
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

function sanitizarProcesso(p: OnedocProcesso): ProcessoPublico {
  return {
    hash: p.hash,
    num: String(p.num),
    ano: String(p.ano),
    num_formatado: p.num_formatado,
    assunto: p.assunto,
    data: p.data,
    hora: p.hora,
    origem_setor: p.origem_setor,
    destino_setor: p.destino_setor,
    situacao_atual_str: p.situacao_atual_str,
    movimentacoes: (p.movimentacoes ?? [])
      .filter((m) => m.data && m.data !== "0000-00-00")
      .map((m) => ({
        id: m.id_emissao_evento ?? m.id_emissao ?? `${m.data}-${m.hora}`,
        evento: m.evento ?? m.tipo_movimentacao_str ?? "Despacho",
        data: m.data,
        hora: m.hora,
        origem_setor: m.origem_setor ?? "",
      })),
    anexos: (p.anexos ?? []).map((a) => {
      // Extração segura da extensão
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

async function obterProcessosPaginadoInterno(
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

    const processos = paginaDados.emissoes.map(sanitizarProcesso);
    // Assumindo 15 itens por página conforme padrão anterior da 1Doc
    const totalPaginas = Math.ceil((paginaDados.total || 0) / 15) || 1;

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

async function obterDetalheInterno(hash: string): Promise<ProcessoPublico | null> {
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
