import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  MapPin,
  User2,
  Info,
  Lock,
  Download,
  ShieldAlert,
  History,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "./index";
import {
  getProcesso,
  formatDateBR,
  formatDateTimeBR,
} from "@/lib/mock-processos";

export const Route = createFileRoute("/processos/$id")({
  loader: ({ params }) => {
    const processo = getProcesso(params.id);
    if (!processo) throw notFound();
    return { processo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Processo não encontrado · Palmital/SP" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.processo;
    const title = `Processo ${p.numero}/${p.ano} · ${p.assunto}`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Rastro auditável e tramitações do processo ${p.numero}/${p.ano} - ${p.assunto}.`,
        },
        { property: "og:title", content: title },
      ],
    };
  },
  component: ProcessoDetalhes,
  notFoundComponent: () => (
    <PortalLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Processo não localizado
        </h1>
        <p className="mt-2 text-muted-foreground">
          Verifique o número/ano informado ou retorne à consulta pública.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à consulta
        </Link>
      </div>
    </PortalLayout>
  ),
});

function ProcessoDetalhes() {
  const { processo } = Route.useLoaderData();

  return (
    <PortalLayout>
      {/* Header do processo */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Consulta Pública
          </Link>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Processo Administrativo
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold text-foreground sm:text-4xl">
                nº {processo.numero}/{processo.ano}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
                {processo.assunto}
              </p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={processo.status} />
            </div>
          </div>
        </div>
      </section>

      {/* Resumo técnico */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary" />
            Resumo Técnico
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Meta
              icon={<FileText className="h-4 w-4" />}
              label="Assunto principal"
              value={processo.setor}
            />
            <Meta
              icon={<Calendar className="h-4 w-4" />}
              label="Data de autuação"
              value={formatDateBR(processo.dataAbertura)}
            />
            <Meta
              icon={<MapPin className="h-4 w-4" />}
              label="Setor de localização"
              value={processo.orgaoAtual}
            />
            <Meta
              icon={<User2 className="h-4 w-4" />}
              label="Interessado"
              value={processo.interessado}
            />
          </dl>
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            {processo.descricao}
          </p>
        </div>

        {/* Timeline */}
        <div className="mt-10">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Linha do Tempo · Rastro Auditável
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tramitações ordenadas do evento mais recente ao mais antigo.
          </p>

          <ol className="relative mt-6 border-l-2 border-border pl-6 sm:pl-8">
            {processo.tramitacoes.map((t, i) => (
              <li key={t.id} className="relative pb-8 last:pb-0">
                <span
                  aria-hidden
                  className={`absolute -left-[33px] sm:-left-[41px] top-1 grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full border-2 border-background ${
                    i === 0
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                </span>
                <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-foreground">{t.evento}</h3>
                    <time className="font-mono text-xs text-muted-foreground">
                      {formatDateTimeBR(t.data)}
                    </time>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                      <Building2 className="h-3 w-3" /> {t.origem}
                    </span>
                    <span className="text-muted-foreground">➔</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">
                      <Building2 className="h-3 w-3" /> {t.destino}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User2 className="h-3.5 w-3.5" />
                    <span>
                      Responsável:{" "}
                      <span className="font-medium text-foreground">
                        {t.responsavel}
                      </span>
                    </span>
                  </div>
                  {t.observacao && (
                    <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                      {t.observacao}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </div>

        {/* Anexos */}
        <div className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            Documentos Anexados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Metadados dos arquivos vinculados ao processo.
          </p>

          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {processo.anexos.map((a) => (
              <li
                key={a.nome}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${
                    a.restrito
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {a.restrito ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{a.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.tipo} · {a.tamanho}
                    {a.restrito && " · Acesso restrito (LGPD)"}
                  </p>
                </div>
                {a.restrito ? (
                  <span className="shrink-0 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Solicitar via e-SIC
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Aviso LGPD */}
        <div
          id="lgpd"
          className="mt-10 rounded-xl border-l-4 border-primary bg-primary/5 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">
                Compliance LGPD e Lei de Acesso à Informação (LAI)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Em conformidade com a{" "}
                <strong className="text-foreground">
                  Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
                </strong>{" "}
                e com o{" "}
                <strong className="text-foreground">
                  Art. 31 da Lei de Acesso à Informação (Lei nº 12.527/2011)
                </strong>
                , os arquivos digitais contendo dados pessoais sensíveis estão
                protegidos e ocultos ao público geral, disponíveis integralmente
                apenas via solicitação formal e auditada pelo{" "}
                <strong className="text-foreground">e-SIC municipal</strong>.
              </p>
              <a
                href="#"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Acessar o e-SIC Municipal <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}