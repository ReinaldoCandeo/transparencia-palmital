export type StatusProcesso = "Em Tramitação" | "Concluído" | "Arquivado";

export interface Tramitacao {
  id: string;
  evento: string;
  data: string; // ISO
  origem: string;
  destino: string;
  responsavel: string; // cargo
  observacao?: string;
}

export interface Anexo {
  nome: string;
  tipo: string;
  tamanho: string;
  restrito?: boolean;
}

export interface Processo {
  id: string;
  numero: string; // 342
  ano: number;
  assunto: string;
  descricao: string;
  dataAbertura: string; // ISO
  orgaoAtual: string;
  setor: "Saúde" | "Obras" | "Administração" | "Educação" | "Fazenda";
  status: StatusProcesso;
  interessado: string;
  tramitacoes: Tramitacao[];
  anexos: Anexo[];
}

export const PROCESSOS: Processo[] = [
  {
    id: "342-2025",
    numero: "342",
    ano: 2025,
    assunto: "Licitação - Aquisição de gêneros alimentícios para merenda escolar",
    descricao:
      "Pregão eletrônico para aquisição de gêneros alimentícios não perecíveis destinados à alimentação escolar da rede municipal, exercício 2025/2026.",
    dataAbertura: "2025-03-11T09:15:00-03:00",
    orgaoAtual: "Departamento de Licitações",
    setor: "Administração",
    status: "Em Tramitação",
    interessado: "Secretaria Municipal de Educação",
    tramitacoes: [
      {
        id: "t1",
        evento: "Publicação do Edital",
        data: "2026-06-24T16:42:00-03:00",
        origem: "Departamento de Licitações",
        destino: "Imprensa Oficial do Município",
        responsavel: "Diretor do Departamento de Licitações",
        observacao: "Edital publicado no Diário Oficial e no Portal Nacional de Contratações Públicas (PNCP).",
      },
      {
        id: "t2",
        evento: "Parecer Jurídico Favorável",
        data: "2026-06-18T11:05:00-03:00",
        origem: "Procuradoria Geral do Município",
        destino: "Departamento de Licitações",
        responsavel: "Procurador-Chefe do Município",
      },
      {
        id: "t3",
        evento: "Remetido para Análise Jurídica",
        data: "2026-06-02T14:30:00-03:00",
        origem: "Departamento de Licitações",
        destino: "Procuradoria Geral do Município",
        responsavel: "Agente de Contratação",
      },
      {
        id: "t4",
        evento: "Termo de Referência Aprovado",
        data: "2026-05-20T10:00:00-03:00",
        origem: "Secretaria Municipal de Educação",
        destino: "Departamento de Licitações",
        responsavel: "Secretário Municipal de Educação",
      },
      {
        id: "t5",
        evento: "Autuação do Processo",
        data: "2025-03-11T09:15:00-03:00",
        origem: "Protocolo Geral",
        destino: "Secretaria Municipal de Educação",
        responsavel: "Chefe do Setor de Protocolo",
      },
    ],
    anexos: [
      { nome: "Edital_Concorrencia_342-2025.pdf", tipo: "PDF", tamanho: "12 MB" },
      { nome: "Termo_Referencia.pdf", tipo: "PDF", tamanho: "3,4 MB" },
      { nome: "Parecer_Juridico_218.pdf", tipo: "PDF", tamanho: "1,2 MB" },
      { nome: "Estudo_Tecnico_Preliminar.pdf", tipo: "PDF", tamanho: "5,8 MB" },
      { nome: "Documentos_Pessoais_Interessado.pdf", tipo: "PDF", tamanho: "0,9 MB", restrito: true },
    ],
  },
  {
    id: "128-2026",
    numero: "128",
    ano: 2026,
    assunto: "Pavimentação Asfáltica - Rua João Pessoa (Bairro Vila Nova)",
    descricao:
      "Contratação de empresa especializada para execução de pavimentação asfáltica em CBUQ, drenagem e sinalização viária.",
    dataAbertura: "2026-01-22T08:40:00-03:00",
    orgaoAtual: "Secretaria Municipal de Obras",
    setor: "Obras",
    status: "Em Tramitação",
    interessado: "Secretaria Municipal de Obras",
    tramitacoes: [
      {
        id: "t1",
        evento: "Ordem de Serviço Emitida",
        data: "2026-06-28T09:20:00-03:00",
        origem: "Secretaria Municipal de Obras",
        destino: "Empresa Contratada",
        responsavel: "Secretário Municipal de Obras",
      },
      {
        id: "t2",
        evento: "Assinatura do Contrato Administrativo",
        data: "2026-06-14T15:00:00-03:00",
        origem: "Departamento de Contratos",
        destino: "Secretaria Municipal de Obras",
        responsavel: "Chefe do Departamento de Contratos",
      },
      {
        id: "t3",
        evento: "Homologação e Adjudicação",
        data: "2026-05-30T17:10:00-03:00",
        origem: "Gabinete do Prefeito",
        destino: "Departamento de Contratos",
        responsavel: "Prefeito Municipal",
      },
      {
        id: "t4",
        evento: "Autuação do Processo",
        data: "2026-01-22T08:40:00-03:00",
        origem: "Protocolo Geral",
        destino: "Secretaria Municipal de Obras",
        responsavel: "Chefe do Setor de Protocolo",
      },
    ],
    anexos: [
      { nome: "Projeto_Executivo_Pavimentacao.pdf", tipo: "PDF", tamanho: "22 MB" },
      { nome: "Ata_Sessao_Publica.pdf", tipo: "PDF", tamanho: "0,8 MB" },
      { nome: "Contrato_Administrativo_048-2026.pdf", tipo: "PDF", tamanho: "2,1 MB" },
    ],
  },
  {
    id: "1077-2025",
    numero: "1077",
    ano: 2025,
    assunto: "Pedido de Alvará de Funcionamento - Estabelecimento Comercial",
    descricao: "Solicitação de emissão de Alvará de Funcionamento para atividade de comércio varejista de alimentos.",
    dataAbertura: "2025-11-04T13:22:00-03:00",
    orgaoAtual: "Departamento de Posturas",
    setor: "Administração",
    status: "Concluído",
    interessado: "Contribuinte (dados protegidos - LGPD)",
    tramitacoes: [
      {
        id: "t1",
        evento: "Alvará Emitido",
        data: "2026-02-10T11:00:00-03:00",
        origem: "Departamento de Posturas",
        destino: "Interessado",
        responsavel: "Diretor do Departamento de Posturas",
      },
      {
        id: "t2",
        evento: "Vistoria Técnica Aprovada",
        data: "2026-01-28T10:15:00-03:00",
        origem: "Vigilância Sanitária",
        destino: "Departamento de Posturas",
        responsavel: "Fiscal Sanitário Municipal",
      },
      {
        id: "t3",
        evento: "Autuação do Processo",
        data: "2025-11-04T13:22:00-03:00",
        origem: "Protocolo Geral",
        destino: "Departamento de Posturas",
        responsavel: "Chefe do Setor de Protocolo",
      },
    ],
    anexos: [
      { nome: "Requerimento_Alvara.pdf", tipo: "PDF", tamanho: "0,3 MB" },
      { nome: "Laudo_Vigilancia_Sanitaria.pdf", tipo: "PDF", tamanho: "1,1 MB" },
      { nome: "CPF_Comprovante_Endereco.pdf", tipo: "PDF", tamanho: "0,4 MB", restrito: true },
    ],
  },
  {
    id: "089-2024",
    numero: "089",
    ano: 2024,
    assunto: "Ordem de Pagamento - Fornecimento de Medicamentos Básicos",
    descricao: "Empenho e liquidação referente ao contrato nº 022/2024 - Farmácia Básica Municipal.",
    dataAbertura: "2024-04-18T09:00:00-03:00",
    orgaoAtual: "Arquivo Público Municipal",
    setor: "Fazenda",
    status: "Arquivado",
    interessado: "Secretaria Municipal de Saúde",
    tramitacoes: [
      {
        id: "t1",
        evento: "Arquivamento Definitivo",
        data: "2025-08-05T14:00:00-03:00",
        origem: "Departamento de Contabilidade",
        destino: "Arquivo Público Municipal",
        responsavel: "Chefe da Contabilidade",
      },
      {
        id: "t2",
        evento: "Pagamento Efetuado",
        data: "2024-05-20T16:30:00-03:00",
        origem: "Tesouraria Municipal",
        destino: "Departamento de Contabilidade",
        responsavel: "Tesoureiro Municipal",
      },
      {
        id: "t3",
        evento: "Liquidação da Despesa",
        data: "2024-05-10T11:20:00-03:00",
        origem: "Secretaria Municipal de Saúde",
        destino: "Tesouraria Municipal",
        responsavel: "Ordenador de Despesas - Saúde",
      },
      {
        id: "t4",
        evento: "Autuação do Processo",
        data: "2024-04-18T09:00:00-03:00",
        origem: "Protocolo Geral",
        destino: "Secretaria Municipal de Saúde",
        responsavel: "Chefe do Setor de Protocolo",
      },
    ],
    anexos: [
      { nome: "Nota_Fiscal_2245.pdf", tipo: "PDF", tamanho: "0,6 MB" },
      { nome: "Empenho_2024_00789.pdf", tipo: "PDF", tamanho: "0,2 MB" },
    ],
  },
  {
    id: "215-2026",
    numero: "215",
    ano: 2026,
    assunto: "Aquisição de Equipamentos Hospitalares - UBS Central",
    descricao: "Dispensa de licitação para aquisição emergencial de equipamentos de suporte à atenção básica.",
    dataAbertura: "2026-02-14T10:05:00-03:00",
    orgaoAtual: "Secretaria Municipal de Saúde",
    setor: "Saúde",
    status: "Em Tramitação",
    interessado: "Secretaria Municipal de Saúde",
    tramitacoes: [
      {
        id: "t1",
        evento: "Despacho Emitido - Solicitação de Cotações",
        data: "2026-06-20T09:30:00-03:00",
        origem: "Secretaria Municipal de Saúde",
        destino: "Departamento de Compras",
        responsavel: "Secretário Municipal de Saúde",
      },
      {
        id: "t2",
        evento: "Autuação do Processo",
        data: "2026-02-14T10:05:00-03:00",
        origem: "Protocolo Geral",
        destino: "Secretaria Municipal de Saúde",
        responsavel: "Chefe do Setor de Protocolo",
      },
    ],
    anexos: [
      { nome: "Justificativa_Dispensa.pdf", tipo: "PDF", tamanho: "0,7 MB" },
      { nome: "Cotacoes_Preliminares.pdf", tipo: "PDF", tamanho: "1,4 MB" },
    ],
  },
  {
    id: "554-2025",
    numero: "554",
    ano: 2025,
    assunto: "Reforma e Ampliação da EMEI Prof. Antônio Ferreira",
    descricao: "Contratação de obra para reforma do telhado e ampliação de duas salas de aula.",
    dataAbertura: "2025-07-30T14:10:00-03:00",
    orgaoAtual: "Secretaria Municipal de Educação",
    setor: "Educação",
    status: "Concluído",
    interessado: "Secretaria Municipal de Educação",
    tramitacoes: [
      {
        id: "t1",
        evento: "Recebimento Definitivo da Obra",
        data: "2026-04-12T15:45:00-03:00",
        origem: "Comissão de Fiscalização",
        destino: "Secretaria Municipal de Educação",
        responsavel: "Fiscal de Contrato",
      },
      {
        id: "t2",
        evento: "Ordem de Serviço Emitida",
        data: "2025-09-15T10:00:00-03:00",
        origem: "Secretaria Municipal de Educação",
        destino: "Empresa Contratada",
        responsavel: "Secretário Municipal de Educação",
      },
      {
        id: "t3",
        evento: "Autuação do Processo",
        data: "2025-07-30T14:10:00-03:00",
        origem: "Protocolo Geral",
        destino: "Secretaria Municipal de Educação",
        responsavel: "Chefe do Setor de Protocolo",
      },
    ],
    anexos: [
      { nome: "Projeto_Arquitetonico.pdf", tipo: "PDF", tamanho: "8,9 MB" },
      { nome: "Termo_Recebimento_Definitivo.pdf", tipo: "PDF", tamanho: "0,5 MB" },
    ],
  },
];

export function getProcesso(id: string) {
  return PROCESSOS.find((p) => p.id === id);
}

export const STATUS_COLORS: Record<StatusProcesso, string> = {
  "Em Tramitação":
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900",
  Concluído:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
  Arquivado:
    "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export function formatDateTimeBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}