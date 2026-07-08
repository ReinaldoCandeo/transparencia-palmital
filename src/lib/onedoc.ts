import { unstable_cache } from "next/cache";
import { SETORES_PERMITIDOS } from "@/config/setores";

// ─── Interfaces do payload bruto da 1Doc ──────────────────────────────────

interface OnedocMovimentacao {
  id_emissao_evento: string | null;
  evento: string;
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
    movimentacoes: (p.movimentacoes ?? []).map((m) => ({
      id: m.id_emissao_evento ?? `${m.data}-${m.hora}`,
      evento: m.evento,
      data: m.data,
      hora: m.hora,
      origem_setor: m.origem_setor,
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

// ─── Paginação com Trava contra Timeout ───────────────────────────────────

/**
 * Percorre as páginas da 1Doc respeitando um limite de segurança (timeout)
 */
async function buscarTodasPaginas(
  path: string
): Promise<OnedocProcesso[]> {
  const { baseUrl, authHash } = getConfig();
  const todos: OnedocProcesso[] = [];
  let pagina = 1;
  let totalEsperado: number | null = null;
  
  // Limite rígido de 50 páginas (1000 processos) para evitar timeouts na Vercel/Node
  const LIMITE_PAGINAS = 50;

  while (pagina <= LIMITE_PAGINAS) {
    const url = `${baseUrl}${path}?pagina=${pagina}`;

    const res = await fetch(url, {
      headers: { "X-Auth-Hash": authHash },
    });

    if (!res.ok) {
      console.error(`1Doc API erro ${res.status} em ${url}`);
      break;
    }

    const json: OnedocResponse = await res.json();
    const paginaDados = json.data?.[0];

    if (!paginaDados || !Array.isArray(paginaDados.emissoes) || paginaDados.emissoes.length === 0) {
      break;
    }

    if (totalEsperado === null) {
      totalEsperado = paginaDados.total;
    }

    todos.push(...paginaDados.emissoes);
    pagina++;

    if (totalEsperado !== null && todos.length >= totalEsperado) {
      break;
    }
  }

  return todos;
}

// ─── Funções Internas de Busca (sem Cache) ───────────────────────────────

async function obterTodosProcessosInterno(): Promise<ProcessoPublico[]> {
  const todos = await buscarTodasPaginas("/processos-administrativos");
  
  // Nota Arquitetural: Filtro desativado temporariamente para validação geral de dados.
  // Reativar quando o critério final de filtragem (setor vs assunto) estiver definido.
  return todos.map(sanitizarProcesso);
}

async function obterDetalheInterno(hash: string): Promise<ProcessoPublico | null> {
  const { baseUrl, authHash } = getConfig();

  const res = await fetch(
    `${baseUrl}/processos-administrativos/${hash}/despachos?pagina=1`,
    {
      headers: { "X-Auth-Hash": authHash },
    }
  );

  if (!res.ok) return null;

  const json: OnedocResponse = await res.json();
  const processo = json.data?.[0]?.emissoes?.[0] ?? null;
  if (!processo) return null;

  return sanitizarProcesso(processo);
}

// ─── Exportações com Cache (Escopo Global para Evitar Memory Leaks) ───────

export const listarProcessos = unstable_cache(
  async () => obterTodosProcessosInterno(),
  ["processos-list"],
  { revalidate: 300, tags: ["processos"] }
);

export const buscarDetalhe = unstable_cache(
  async (hash: string) => obterDetalheInterno(hash),
  ["processo-detalhe"],
  { revalidate: 300 }
);
