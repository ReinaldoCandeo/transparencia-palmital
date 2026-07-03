import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { get1DocProcessDetails } from "@/lib/onedoc";
import { StatusBadge } from "@/components/portal/BuscaProcessosClient";

function formatDateBR(isoString: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

interface Servidor {
  cargo: string;
  setor: string;
}

interface Tramitacao {
  id: string;
  data: string;
  descricao: string;
  despacho?: string;
  tipo: string;
  setor: string;
  servidor?: Servidor;
}

interface Anexo {
  nome: string;
  tamanho: string;
  tipo: string;
}

interface ProcessoDetalhado {
  id: string;
  numero: string;
  ano: number;
  assunto: string;
  status: string;
  setor: string;
  orgaoAtual: string;
  dataAbertura: string;
  requerente_nome: string;
  tramitacoes?: Tramitacao[];
  anexos?: Anexo[];
}

export default async function DetalhesProcesso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rawData = await get1DocProcessDetails(id);

  if (!rawData) {
    return (
      <PortalLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
          <p className="text-muted-foreground">Processo não encontrado ou indisponível.</p>
          <Link href="/" className="text-primary hover:underline">
            Voltar para a busca
          </Link>
        </div>
      </PortalLayout>
    );
  }

  // Mapeamento dinâmico do payload 1Doc
  const processo: ProcessoDetalhado = {
    id: String(rawData.id || rawData.id_documento || id),
    numero: String(rawData.numero || rawData.numero_processo || "N/A"),
    ano: Number(rawData.ano || new Date().getFullYear()),
    assunto: String(rawData.assunto || rawData.nome || "Assunto Indefinido"),
    status: String(rawData.status || rawData.situacao || "Em Tramitação"),
    setor: String(rawData.setor || rawData.departamento || "Geral"),
    orgaoAtual: String(rawData.orgaoAtual || rawData.orgao || "Administração"),
    dataAbertura: String(rawData.dataAbertura || rawData.data_cadastro || new Date().toISOString()),
    requerente_nome: String(rawData.requerente_nome || rawData.solicitante || "Cidadão (LGPD)"),
    tramitacoes: Array.isArray(rawData.tramitacoes) ? rawData.tramitacoes : [],
    anexos: Array.isArray(rawData.anexos) ? rawData.anexos : []
  };

  if (processo.tramitacoes) {
    processo.tramitacoes.sort((a: Tramitacao, b: Tramitacao) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }

  if (!processo) {
    return (
      <PortalLayout>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-2xl font-bold">Processo não encontrado</h2>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline">
            Voltar para o início
          </Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para busca
          </Link>

          <div className="mt-6 space-y-6">
            {/* Header do processo */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
                    Autuação nº {processo.numero}/{processo.ano}
                  </h1>
                  <p className="mt-2 text-lg font-medium text-muted-foreground">
                    Assunto: {processo.assunto}
                  </p>
                </div>
                <StatusBadge status={processo.status} />
              </div>

              <div className="mt-8 grid gap-6 rounded-xl bg-muted/40 p-5 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Abertura
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {formatDateBR(processo.dataAbertura)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Building className="h-4 w-4" /> Órgão atual
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {processo.orgaoAtual}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <User className="h-4 w-4" /> Requerente
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {processo.requerente_nome || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <AlertCircle className="h-4 w-4" /> Visibilidade
                  </dt>
                  <dd className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    Público
                  </dd>
                </div>
              </div>
            </div>

            {/* Documentos Anexados & Aviso LGPD */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-800 dark:text-yellow-200">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Aviso de Privacidade - LGPD</p>
                  <p className="mt-1 opacity-90">
                    Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), 
                    os anexos brutos contendo informações pessoais estão restritos a acessos autenticados. 
                    Neste portal público são exibidos apenas os metadados dos documentos comprobatórios.
                  </p>
                </div>
              </div>
              
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileText className="h-5 w-5 text-muted-foreground" /> Documentos Anexados
              </h3>
              
              {processo.anexos && processo.anexos.length > 0 ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {processo.anexos.map((doc: Anexo, i: number) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.nome || "Documento"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.tamanho || "Tamanho desconhecido"} • {doc.tipo || "PDF"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhum documento público anexado a este processo.
                </p>
              )}
            </div>

            {/* Histórico / Linha do tempo */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-muted-foreground" /> Histórico de
                Despachos
              </h3>

              <div className="mt-8 flow-root">
                <ul className="-mb-8">
                  {processo.tramitacoes?.map((evento: Tramitacao, eventoIdx: number) => (
                    <li key={evento.id}>
                      <div className="relative pb-8">
                        {eventoIdx !== (processo.tramitacoes?.length ?? 0) - 1 ? (
                          <span
                            className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-border"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex items-start space-x-4">
                          <div className="relative">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background ring-8 ring-card">
                              {evento.tipo === "Conclusão" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : evento.tipo === "Abertura" ? (
                                <AlertCircle className="h-5 w-5 text-blue-500" />
                              ) : (
                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium text-foreground">
                                {evento.descricao}
                              </p>
                              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                                <span className="flex items-center gap-1.5">
                                  <Building className="h-3.5 w-3.5" /> {evento.setor}
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" /> 
                                  {evento.servidor?.cargo || "Servidor Municipal"}
                                </span>
                              </div>
                            </div>
                            {evento.despacho && (
                              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm italic text-foreground">
                                "{evento.despacho}"
                              </div>
                            )}
                            <div className="mt-2 text-xs font-medium text-muted-foreground">
                              {formatDateBR(evento.data)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {(!processo.tramitacoes || processo.tramitacoes.length === 0) && (
                    <p className="text-sm text-muted-foreground pb-8">
                      Nenhuma tramitação registrada.
                    </p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
