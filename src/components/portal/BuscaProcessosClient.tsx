"use client";

import Link from "next/link";

import { useRouter, usePathname } from "next/navigation";
import {
  ArrowRight,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PainelBuscaUnificado, type FiltrosAtivos } from "@/components/portal/PainelBuscaUnificado";
import type { ProcessoEmendaRow } from "@/lib/schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateBR(dataStr: string | null | undefined) {
  if (!dataStr) return "";
  if (!dataStr.includes("/")) return dataStr;
  const [dia, mes, ano] = dataStr.split("/");
  return `${dia}/${mes}/${ano}`;
}

/** Palavras que indicam que o último segmento do assunto NÃO é um nome de autor */
const ASSUNTO_NAO_AUTOR = ["CUSTEIO", "EMENDA", "SETOR", "REPASSE", "MUN", "FED", "INVEST", "CAPITAL"];

function normalizeStr(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u00BA/g, "o").toLowerCase().trim();
}

function getAutorEmenda(p: ProcessoEmendaRow) {
  if (p.form_data && Array.isArray(p.form_data)) {
    // Busca EXPLÍCITA: apenas labels de autor parlamentar/vereador
    const autores = (p.form_data as any[])
      .filter((f: any) => {
        const norm = normalizeStr(f.label || "");
        return norm.includes("vereador autor") || norm.includes("parlamentar autor");
      })
      .map((f: any) => f.valor as string)
      .filter(Boolean);

    if (autores.length > 0) return autores.join(", ");
  }

  // Fallback: última parte do assunto separado por " - ", mas só se parece um nome
  if (p.assunto && p.assunto.includes(" - ")) {
    const parts = p.assunto.split(" - ");
    const last = parts[parts.length - 1].trim();
    const ehNome = last.length > 3 && !ASSUNTO_NAO_AUTOR.some((w) => last.toUpperCase().includes(w));
    if (ehNome) return last;
  }

  return "Não identificado";
}

const STATUS_COLORS: Record<string, string> = {
  "Em Tramitação": "border-blue-500/20 bg-blue-500/10 text-blue-500",
  Concluído: "border-green-500/20 bg-green-500/10 text-green-500",
  Arquivado:
    "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
};

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
  processos,
  paginaAtual,
  totalPaginas,
  filtrosAtivos,
}: {
  processos: ProcessoEmendaRow[];
  paginaAtual: number;
  totalPaginas: number;
  filtrosAtivos: FiltrosAtivos;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <PortalLayout>
      {/* Hero de Busca Exata (Client Action) */}
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
              Municipal com rastro auditável.
            </p>
          </div>
        </div>
      </section>

      {/* Painel de Controle Unificado (Filtros + Acesso Direto) - FLUTUANTE */}
      <PainelBuscaUnificado filtrosAtivos={filtrosAtivos} />

      {/* Listagem Exploratória (SSR Filtrada) */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mt-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Listagem Geral (Últimos Processos)
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {processos.length} processo{processos.length !== 1 ? "s" : ""} encontrado{processos.length !== 1 ? "s" : ""}
            </p>
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
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3 sr-only">Ações</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((p) => (
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
                  <td className="px-4 py-4 text-foreground font-medium">
                    {getAutorEmenda(p)}
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
              {processos.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Nenhum processo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <ul className="mt-6 grid gap-4 md:hidden list-none p-0 m-0">
          {processos.map((p) => (
            <li
              key={p.hash}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {p.num_formatado}
                </span>
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
                    Autor (Deputado/Vereador)
                  </dt>
                  <dd className="mt-0.5 text-foreground font-medium">{getAutorEmenda(p)}</dd>
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
          {processos.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground border border-border rounded-xl">
               Nenhum processo encontrado.
            </li>
          )}
        </ul>

        {/* Paginação Desabilitada na PoC */}
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
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 w-full sm:w-48">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
