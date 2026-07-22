import { z } from "zod";

/**
 * Schema Zod de validação rigorosa para a tabela `processos_emendas`.
 * Protege o banco de dados contra mudanças silenciosas na API da 1Doc.
 */
export const processoEmendaSchema = z.object({
  // Campos obrigatórios estruturais
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

  // EmendaInfo (Saúde) - 1915747
  emenda_origem: z.string().nullable().optional(),
  emenda_lei_portaria: z.string().nullable().optional(),
  emenda_funcao_legislativa: z.string().nullable().optional(),
  emenda_num_emenda: z.string().nullable().optional(),
  emenda_num_proposta: z.string().nullable().optional(),
  emenda_tipo: z.string().nullable().optional(),
  emenda_bloco: z.string().nullable().optional(),
  emenda_valor_raw: z.string().nullable().optional(),
  emenda_valor_formatado: z.string().nullable().optional(),
  emenda_exercicio: z.string().nullable().optional(),
  emenda_banco: z.string().nullable().optional(),
  emenda_justificativa: z.string().nullable().optional(),

  // EmendaSocialInfo (Social) - 1915739, 1915740
  social_num_emenda: z.string().nullable().optional(),
  social_ano: z.string().nullable().optional(),
  social_objeto: z.string().nullable().optional(),
  social_origem: z.string().nullable().optional(),
  social_modalidade: z.string().nullable().optional(),
  social_cnpj_concessor: z.string().nullable().optional(),
  social_cnpj_beneficiaria: z.string().nullable().optional(),
  social_razao_social: z.string().nullable().optional(),
  social_valor_total: z.string().nullable().optional(),
  
  // --- BLOCOS COMPLEXOS (Fallback Inteligente com Tipagem Estrita) ---
  social_autores_repasses: z.array(
    z.object({
      nome: z.string(),
      valor: z.string(),
    })
  ).nullable().default([]),

  movimentacoes: z.array(
    z.object({
      id: z.string(),
      evento: z.string(),
      data: z.string(),
      hora: z.string(),
      origem_setor: z.string(),
      anexos: z.array(
        z.object({
          arquivo: z.string(),
          extensao: z.string(),
          tamanho_bytes: z.number(),
          tipo_mime: z.string(),
        })
      ).optional(),
    })
  ).nullable().default([]),

  anexos: z.array(
    z.object({
      arquivo: z.string(),
      extensao: z.string(),
      tamanho_bytes: z.number(),
      tipo_mime: z.string(),
    })
  ).nullable().default([]),
});

// Tipagem inferida para uso no TypeScript
export type ProcessoEmendaRow = z.infer<typeof processoEmendaSchema>;

/**
 * Função utilitária para "achatar" (flatten) o payload hierárquico da 1Doc
 * para o formato flat exigido pelo schema do Zod (e pela tabela do Supabase).
 */
export function flattenProcessoParaRow(p: any): any {
  return {
    ...p,
    // Achata campos de emenda de Saúde
    emenda_origem: p.emenda?.origem ?? null,
    emenda_lei_portaria: p.emenda?.lei_portaria ?? null,
    emenda_funcao_legislativa: p.emenda?.funcao_legislativa ?? null,
    emenda_num_emenda: p.emenda?.num_emenda ?? null,
    emenda_num_proposta: p.emenda?.num_proposta ?? null,
    emenda_tipo: p.emenda?.tipo ?? null,
    emenda_bloco: p.emenda?.bloco ?? null,
    emenda_valor_raw: p.emenda?.valor_raw ?? null,
    emenda_valor_formatado: p.emenda?.valor_disponibilizado ?? null,
    emenda_exercicio: p.emenda?.exercicio ?? null,
    emenda_banco: p.emenda?.banco ?? null,
    emenda_justificativa: p.emenda?.justificativa ?? null,

    // Achata campos de emenda Social
    social_num_emenda: p.emenda_social?.num_emenda ?? null,
    social_ano: p.emenda_social?.ano ?? null,
    social_objeto: p.emenda_social?.objeto ?? null,
    social_origem: p.emenda_social?.origem ?? null,
    social_modalidade: p.emenda_social?.modalidade ?? null,
    social_cnpj_concessor: p.emenda_social?.cnpj_concessor ?? null,
    social_cnpj_beneficiaria: p.emenda_social?.cnpj_beneficiaria ?? null,
    social_razao_social: p.emenda_social?.razao_social ?? null,
    social_valor_total: p.emenda_social?.valor_total ?? null,
    social_autores_repasses: p.emenda_social?.autores_repasses ?? [],
    
    situacao_atual: p.situacao_atual_str ?? p.situacao_atual ?? null
  };
}
