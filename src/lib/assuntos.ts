/**
 * src/lib/assuntos.ts
 * 
 * Grupos Semânticos de Assuntos (Fonte única de verdade).
 * Extraído para um arquivo sem dependências para evitar importação circular
 * entre onedoc.ts e search-extractors.ts.
 */

/** Controle interno de saúde (emendas federais MAC) */
export const ASSUNTOS_SAUDE = new Set([
  1915747, // Controle Interno de Emendas - SAÚDE
]);

/** Controle interno de obras - forms legado e novo forms */
export const ASSUNTOS_OBRAS = new Set([
  1915780, // Emenda Parlamentar (Cadastro) - OBRAS [forms legado]
  1915790, // Emenda Parlamentar (nv) - OBRAS [novo forms]
]);

/** Emenda Parlamentar (nv) - AGRICULTURA E MEIO AMBIENTE [novo forms] */
export const ASSUNTOS_AGRICULTURA = new Set([
  1915789,
]);

/** Emenda Parlamentar (nv) - EDUCAÇÃO [novo forms] */
export const ASSUNTOS_EDUCACAO = new Set([
  1915782,
]);

/** Todos os IDs que representam o fluxo "Terceiro Setor" */
export const ASSUNTOS_TERCEIRO_SETOR = new Set([
  1915739, // Terceiro Setor - Emendas Municipais - SOCIAL
  1915740, // Terceiro Setor - Emenda Parlamentar Estadual/Federal - SOCIAL
  1915759, // Emenda Parlamentar - ESPORTE (formato antigo)
  1915774, // Terceiro Setor - Emendas Municipais - AGRICULTURA E MEIO AMBIENTE
  1915763, // Terceiro Setor - Emendas Municipais - EDUCAÇÃO E CULTURA
  1915772, // Terceiro Setor - Emendas Municipais - ESPORTE
  1915764, // Terceiro Setor - Emendas Municipais - SAÚDE
  1915792, // Terceiro Setor Repasses - padrão
  1915796, // Terceiro Setor Repasses - SOCIAL (Nova Modalidade)
  1915799, // Terceiro Setor Repasses - AGRICULTURA E MEIO AMBIENTE
  1915798, // Terceiro Setor Repasses - EDUCAÇÃO
  1915801, // Terceiro Setor Repasses - SAÚDE
  1915800, // Terceiro Setor Repasses - ESPORTE
]);

/** União de todos os assuntos aceitos pelo portal (porteira de ingestão) */
export const ASSUNTOS_EMENDA = new Set([
  ...ASSUNTOS_TERCEIRO_SETOR,
]);

export type SearchCategoria = "saude" | "obras" | "agricultura" | "educacao" | "terceiro_setor" | "outros";
