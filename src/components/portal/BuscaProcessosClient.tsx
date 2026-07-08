"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ArrowRight,
  FileText,
  ShieldCheck,
  Clock3,
  Building,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import type { ProcessoPublico } from "@/lib/onedoc";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateBR(dataStr: string) {
  if (!dataStr) return "";
  if (!dataStr.includes("/")) return dataStr;
  const [dia, mes, ano] = dataStr.split("/");
  return `${dia}/${mes}/${ano}`;
}

const STATUS_COLORS: Record<string, string> = {
  "Em Tramitação": "border-blue-500/20 bg-blue-500/10 text-blue-500",
  Concluído: "border-green-500/20 bg-green-500/10 text-green-500",
  Arquivado:
    "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
};

// ─── StatusBadge (exportado — usado em processos/[hash]/page.tsx) ──────────

export function StatusBadge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status] ??
    "border-gray-500/20 bg-gray-500/10 text-gray-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function BuscaProcessosClient({
  initialProcessos,
}: {
  initialProcessos: ProcessoPublico[];
}) {
  const [q, setQ] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  const [processos, setProcessos] = useState<ProcessoPublico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setProcessos(initialProcessos);
    setIsLoading(false);
  }, [initialProcessos]);

  // Lista de situações únicas para o filtro — derivada dos dados reais
  const statusDisponiveis = useMemo(() => {
    const unique = [...new Set(processos.map((p) => p.situacao_atual_str))];
    return unique.sort();
  }, [processos]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return processos.filter((p) => {
      if (statusFiltro !== "Todos" && p.situacao_atual_str !== statusFiltro)
        return false;
      if (!query) return true;
      return (
        p.num?.toString().includes(query) ||
        p.ano?.toString().includes(query) ||
        p.num_formatado?.toLowerCase().includes(query) ||
        p.assunto?.toLowerCase().includes(query) ||
        p.destino_setor?.toLowerCase().includes(query) ||
        p.origem_setor?.toLowerCase().includes(query)
      );
    });
  }, [q, statusFiltro, processos]);

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
              Acesso público · Somente leitura (LGPD Compliant)
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Consulta de Processos Administrativos
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/85 sm:text-base">
              Acompanhe a tramitação completa dos processos da Prefeitura
              Municipal com rastro auditável, em conformidade com a Nova Lei de
              Licitações e a Lei de Acesso à Informação.
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
              {isLoading
                ? "Carregando..."
                : `${results.length} processo(s) encontrado(s)`}
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <FiltroSelecao
              label="Situação"
              value={statusFiltro}
              onChange={setStatusFiltro}
              options={["Todos", ...statusDisponiveis]}
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
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Setor atual</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 sr-only">Ações</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p) => (
                <tr
                  key={p.hash}
                  className="group border-t border-border transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-4 font-mono text-sm font-semibold text-foreground">
                    {p.num_formatado}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/processos/${p.hash}`}
                      className="line-clamp-2 font-medium text-foreground hover:text-primary"
                    >
                      {p.assunto}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Origem: {p.origem_setor}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDateBR(p.data)}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {p.destino_setor}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={p.situacao_atual_str} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/processos/${p.hash}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Detalhes <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {!isLoading && results.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Nenhum processo encontrado para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <ul className="mt-6 grid gap-4 md:hidden list-none p-0 m-0">
          {results.map((p) => (
            <li
              key={p.hash}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {p.num_formatado}
                </span>
                <StatusBadge status={p.situacao_atual_str} />
              </div>
              <Link
                href={`/processos/${p.hash}`}
                className="mt-2 block font-medium text-foreground hover:text-primary"
              >
                {p.assunto}
              </Link>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  <dt className="uppercase tracking-wide text-[10px] font-semibold text-slate-500 dark:text-slate-300">
                    Data
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatDateBR(p.data)}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-[10px] font-semibold text-slate-500 dark:text-slate-300">
                    Setor atual
                  </dt>
                  <dd className="mt-0.5 text-foreground">{p.destino_setor}</dd>
                </div>
              </dl>
              <Link
                href={`/processos/${p.hash}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-emerald-500 dark:hover:text-emerald-400 hover:underline transition-colors"
              >
                Ver detalhes <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Indicadores institucionais */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <CartaoIndicador
            icon={<FileText className="h-5 w-5" />}
            label="Autuações Publicadas"
            value={processos.length.toString()}
          />
          <CartaoIndicador
            icon={<Clock3 className="h-5 w-5" />}
            label="Em Tramitação"
            value={processos
              .filter((p) => p.situacao_atual_str === "Em Tramitação")
              .length.toString()}
          />
          <CartaoIndicador
            icon={<Building className="h-5 w-5" />}
            label="Setor Responsável"
            value="Terceiro Setor"
          />
        </div>
      </section>
    </PortalLayout>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────

function FiltroSelecao({
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
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 w-full md:w-64">
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

function CartaoIndicador({
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
