import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Building,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { buscarDetalhe } from "@/lib/onedoc";
import { StatusBadge } from "@/components/portal/BuscaProcessosClient";

function formatDateBR(dataStr: string, horaStr?: string) {
  if (!dataStr) return "";
  // A 1Doc retorna data no formato "DD/MM/YYYY" e hora como "HH:MM"
  // Montamos um ISO aproximado para exibição formatada
  const [dia, mes, ano] =
    dataStr.includes("/") ? dataStr.split("/") : [null, null, null];
  if (!dia || !mes || !ano) return dataStr; // fallback: exibe o valor bruto
  const iso = `${ano}-${mes}-${dia}${horaStr ? "T" + horaStr : ""}`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(horaStr ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

export default async function DetalhesProcesso({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const processo = await buscarDetalhe(hash);

  if (!processo) {
    return (
      <PortalLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
          <p className="text-muted-foreground">
            Processo não encontrado ou indisponível.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Voltar para a busca
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
                    Autuação nº {processo.num_formatado}
                  </h1>
                  <p className="mt-2 text-lg font-medium text-muted-foreground">
                    {processo.assunto}
                  </p>
                </div>
                <StatusBadge status={processo.situacao_atual_str} />
              </div>

              <div className="mt-8 grid gap-6 rounded-xl bg-muted/40 p-5 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Data de abertura
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {formatDateBR(processo.data, processo.hora)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Building className="h-4 w-4" /> Setor de origem
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {processo.origem_setor}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Building className="h-4 w-4" /> Setor atual (destino)
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {processo.destino_setor}
                  </dd>
                </div>
              </div>
            </div>

            {/* Documentos Anexados & Aviso LGPD */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-800 dark:text-yellow-200">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Aviso de Privacidade — LGPD</p>
                  <p className="mt-1 opacity-90">
                    Em conformidade com a Lei Geral de Proteção de Dados (Lei nº
                    13.709/2018), os arquivos originais estão restritos a
                    acessos autenticados. Este portal exibe apenas os metadados
                    dos documentos comprobatórios.
                  </p>
                </div>
              </div>

              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileText className="h-5 w-5 text-muted-foreground" /> Documentos
                Anexados
              </h3>

              {processo.anexos && processo.anexos.length > 0 ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {processo.anexos.map((doc, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.arquivo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.extensao.toUpperCase()} •{" "}
                          {doc.tamanho_bytes > 0
                            ? `${(doc.tamanho_bytes / 1024).toFixed(0)} KB`
                            : doc.tipo_mime}
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

            {/* Histórico / Linha do tempo de movimentações */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-muted-foreground" /> Histórico de
                Movimentações
              </h3>

              <div className="mt-8 flow-root">
                <ul className="-mb-8">
                  {processo.movimentacoes.map((mov, idx) => (
                    <li key={mov.id}>
                      <div className="relative pb-8">
                        {idx !== processo.movimentacoes.length - 1 ? (
                          <span
                            className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-border"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex items-start space-x-4">
                          <div className="relative">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background ring-8 ring-card">
                              {idx === 0 ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : idx === processo.movimentacoes.length - 1 ? (
                                <AlertCircle className="h-5 w-5 text-blue-500" />
                              ) : (
                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <p className="font-medium text-foreground text-sm">
                              {mov.evento}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building className="h-3.5 w-3.5" />
                              {mov.origem_setor}
                            </div>
                            <div className="mt-1 text-xs font-medium text-muted-foreground">
                              {formatDateBR(mov.data, mov.hora)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}

                  {processo.movimentacoes.length === 0 && (
                    <p className="text-sm text-muted-foreground pb-8">
                      Nenhuma movimentação registrada.
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
