/**
 * IDs dos setores cujos processos são exibidos no Portal de Transparência.
 *
 * Para adicionar um setor:
 *   1. Descubra o `origem_id_setor` ou `destino_id_setor` nos dados da 1Doc.
 *   2. Adicione o ID como string neste array, com comentário identificando o setor.
 *   3. Faça deploy — nenhuma variável de ambiente precisa ser alterada.
 */
export const SETORES_PERMITIDOS: readonly string[] = [
  "1915739", // Terceiro Setor - Emendas Municipais - SOCIAL
];
