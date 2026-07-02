import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  ArrowRight,
  FileText,
  ShieldCheck,
  Clock3,
  Building,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import {
  PROCESSOS,
  STATUS_COLORS,
  formatDateBR,
  type StatusProcesso,
} from "@/lib/mock-processos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portal da Transparência · Prefeitura de Palmital/SP" },
      {
        name: "description",
        content:
          "Consulte processos administrativos, tramitações e documentos públicos do Município de Palmital/SP em conformidade com a Lei 14.133/2021 e a LAI.",
      },
      { property: "og:title", content: "Portal da Transparência · Palmital/SP" },
      {
        property: "og:description",
        content: "Rastro auditável de processos administrativos municipais.",
      },
    ],
  }),
  component: Index,
});

const STATUSES: StatusProcesso[] = ["Em Tramitação", "Concluído", "Arquivado"];
const SETORES = ["Saúde", "Obras", "Administração", "Educação", "Fazenda"] as const;

function Index() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusProcesso | "Todos">("Todos");
  const [setor, setSetor] = useState<(typeof SETORES)[number] | "Todos">("Todos");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return PROCESSOS.filter((p) => {
      if (status !== "Todos" && p.status !== status) return false;
      if (setor !== "Todos" && p.setor !== setor) return false;
      if (!query) return true;
      return (
        p.numero.includes(query) ||
        String(p.ano).includes(query) ||
        `${p.numero}/${p.ano}`.includes(query) ||
        p.assunto.toLowerCase().includes(query) ||
        p.orgaoAtual.toLowerCase().includes(query) ||
        p.setor.toLowerCase().includes(query)
      );
    });
  }, [q, status, setor]);

  return (
    <PortalLayout>
      {/* Hero de busca */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acesso público · Somente leitura
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Consulta de Processos Administrativos
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/85 sm:text-base">
              Acompanhe a tramitação completa dos processos da Prefeitura Municipal
              com rastro auditável, em conformidade com a Nova Lei de Licitações e a
              Lei de Acesso à Informação.
            </p>

            <div className="mt-8">
              <label className="sr-only" htmlFor="q">
                Pesquisar processo
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-background p-2 text-foreground shadow-lg ring-1 ring-black/5">
                <div className="flex flex-1 items-center gap-2 pl-2">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <input
                    id="q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder='Buscar por Número, Ano ou Assunto (ex: "342/2025" ou "Licitação")'
                    className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
                  />
                </div>
                <button className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex">
                  Pesquisar
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/85">
                <span className="inline-flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Sugestões:
                </span>
                {["342/2025", "Licitação", "Pavimentação", "Alvará"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQ(s)}
                    className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 hover:bg-primary-foreground/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros + tabela */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Resultados da consulta
            </h3>
            <p className="text-sm text-muted-foreground">
              {results.length} processo{results.length === 1 ? "" : "s"} encontrado
              {results.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FilterSelect
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as StatusProcesso | "Todos")}
              options={["Todos", ...STATUSES]}
            />
            <FilterSelect
              label="Setor"
              value={setor}
              onChange={(v) => setSetor(v as (typeof SETORES)[number] | "Todos")}
              options={["Todos", ...SETORES]}
            />
          </div>
        </div>

        {/* Tabela (desktop) */}
        <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Número/Ano</th>
                <th className="px-4 py-3">Assunto</th>
                <th className="px-4 py-3">Data de abertura</th>
                <th className="px-4 py-3">Órgão atual</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 sr-only">Ações</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p) => (
                <tr
                  key={p.id}
                  className="group border-t border-border transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-4 font-mono text-sm font-semibold text-foreground">
                    {p.numero}/{p.ano}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to="/processos/$id"
                      params={{ id: p.id }}
                      className="line-clamp-2 font-medium text-foreground hover:text-primary"
                    >
                      {p.assunto}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Setor: {p.setor}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDateBR(p.dataAbertura)}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{p.orgaoAtual}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      to="/processos/$id"
                      params={{ id: p.id }}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Detalhes <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum processo encontrado para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <ul className="mt-6 grid gap-3 md:hidden">
          {results.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {p.numero}/{p.ano}
                </span>
                <StatusBadge status={p.status} />
              </div>
              <Link
                to="/processos/$id"
                params={{ id: p.id }}
                className="mt-2 block font-medium text-foreground hover:text-primary"
              >
                {p.assunto}
              </Link>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt className="uppercase tracking-wide text-[10px]">Abertura</dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatDateBR(p.dataAbertura)}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-[10px]">Órgão atual</dt>
                  <dd className="mt-0.5 text-foreground">{p.orgaoAtual}</dd>
                </div>
              </dl>
              <Link
                to="/processos/$id"
                params={{ id: p.id }}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Ver detalhes <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
          {results.length === 0 && (
            <li className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Nenhum processo encontrado.
            </li>
          )}
        </ul>

        {/* Indicadores institucionais */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <IndicatorCard
            icon={<FileText className="h-5 w-5" />}
            label="Processos publicados"
            value={PROCESSOS.length.toString()}
          />
          <IndicatorCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Em tramitação"
            value={PROCESSOS.filter((p) => p.status === "Em Tramitação").length.toString()}
          />
          <IndicatorCard
            icon={<Building className="h-5 w-5" />}
            label="Órgãos integrados"
            value={SETORES.length.toString()}
          />
        </div>
      </section>
    </PortalLayout>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatusBadge({ status }: { status: StatusProcesso }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function IndicatorCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
