import { z } from "zod";
import type { ProcessoPublico } from "./onedoc";
import {
  extractSearchAutores,
  extractSearchEsfera,
  extractSearchCategoria,
  extractAnoEmenda,
  extractSearchEntidade,
  extractSearchCnpj,
  extractSearchValorGlobal,
  isAnexoSensivel,
  calculateTotalValorEmenda,
} from "@/lib/search-extractors";

/**
 * Schema Zod de validação rigorosa para a tabela `processos_emendas`.
 * Protege o banco de dados contra mudanças silenciosas na API da 1Doc.
 */
export const processoEmendaSchema = z.object({
  // Campos obrigatórios estruturais
  id_emissao: z.string().optional(),
  id_emissao_base: z.string().nullable().optional(),
  hash: z.string().min(1, "Hash é obrigatório para upsert"),
  num: z.string().min(1, "Número é obrigatório"),
  ano: z.string().min(1, "Ano é obrigatório"),
  id_assunto: z.coerce.number().int("O ID do assunto deve ser numérico inteiro"),

  // Campos básicos (podem vir vazios)
  num_formatado: z.string().nullable().optional(),
  assunto: z.string().nullable().optional(),
  data: z.string().nullable().optional(),
  hora: z.string().nullable().optional(),
  origem_setor: z.string().nullable().optional(),
  destino_setor: z.string().nullable().optional(),
  situacao_atual: z.string().nullable().optional(),
  ultima_sincronizacao: z.string().optional(),
  conteudo: z.string().nullable().optional(),

  // Dados dinâmicos extraídos dos formulários da 1Doc
  form_data: z.array(
    z.object({
      label: z.string(),
      valor: z.string(),
      tipo: z.string().optional()
    })
  ).nullable().default([]),

  movimentacoes: z.array(
    z.object({
      id: z.string(),
      evento: z.string(),
      data: z.string(),
      hora: z.string(),
      origem_setor: z.string(),
      conteudo: z.string().optional(),
      anexos: z.array(
        z.object({
          id_externo: z.string().optional(),
          arquivo: z.string(),
          extensao: z.string(),
          tamanho_bytes: z.number(),
          tipo_mime: z.string(),
          url_storage: z.string().nullable().optional(),
        })
      ).optional(),
    })
  ).nullable().default([]),

  anexos: z.array(
    z.object({
      id_externo: z.string().optional(),
      arquivo: z.string(),
      extensao: z.string(),
      tamanho_bytes: z.number(),
      tipo_mime: z.string(),
      url_storage: z.string().nullable().optional(),
    })
  ).nullable().default([]),
  // Colunas de busca planas (flattening para performance)
  search_autores:   z.string().nullable().optional(),
  search_esfera:    z.string().nullable().optional(),
  search_categoria: z.string().nullable().optional(),
  search_ano:       z.number().int().nullable().optional(),
  ano_emenda_ext:   z.number().int().nullable().optional(),
  search_entidade:  z.string().nullable().optional(),
  search_cnpj:      z.string().nullable().optional(),
  search_valor_global: z.number().nullable().optional(),
});

// Tipagem inferida para uso no TypeScript
export type ProcessoEmendaRow = z.infer<typeof processoEmendaSchema>;

/**
 * Função utilitária para "achatar" (flatten) o payload hierárquico da 1Doc
 * para o formato flat exigido pelo schema do Zod (e pela tabela do Supabase).
 */
export function flattenProcessoParaRow(p: ProcessoPublico): ProcessoEmendaRow {
  const formData = p.form_data || [];
  const conteudoSemHtml = p.conteudo?.replace(/<[^>]*>?/gm, "").trim();
  const anoNum = p.ano ? parseInt(p.ano) : null;

  const row: ProcessoEmendaRow = {
    ...p,
    anexos: p.anexos ? p.anexos.filter(a => !isAnexoSensivel(a.arquivo)) : [],
    movimentacoes: p.movimentacoes ? p.movimentacoes.map(m => ({
      ...m,
      anexos: m.anexos ? m.anexos.filter(a => !isAnexoSensivel(a.arquivo)) : []
    })) : [],
    form_data: formData,
    destino_setor: p.destino_setor,
    situacao_atual: p.situacao_atual_str,
    ultima_sincronizacao: new Date().toISOString(),
    conteudo: p.conteudo,
    // Colunas de busca planas
    search_autores:   extractSearchAutores(formData, conteudoSemHtml) || null,
    search_esfera:    extractSearchEsfera(formData) || null,
    search_categoria: extractSearchCategoria(p.id_assunto) || null,
    search_ano:       !isNaN(anoNum as number) ? anoNum : null,
    ano_emenda_ext:   extractAnoEmenda(formData, conteudoSemHtml) || null,
    search_entidade:  extractSearchEntidade(formData, p.assunto) || null,
    search_cnpj:      extractSearchCnpj(formData) || null,
    search_valor_global: calculateTotalValorEmenda(formData, conteudoSemHtml),
  };

  const { situacao_atual_str, form_data: _form, ...rowLimpa } = row as any;
  rowLimpa.form_data = row.form_data;

  return rowLimpa as ProcessoEmendaRow;
}
