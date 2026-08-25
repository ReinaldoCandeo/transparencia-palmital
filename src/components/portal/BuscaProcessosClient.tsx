"use client";

import Link from "next/link";

import { useRouter, usePathname } from "next/navigation";
import {
  ArrowRight,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
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

function formatSearchAutores(str: string) {
  if (!str) return "";
  return str.split(', ').map(name => 
    name.split(' ').map(word => 
      ['de', 'da', 'do', 'dos', 'das'].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  ).join(', ');
}

function getAutorEmenda(p: ProcessoEmendaRow) {
  if (p.search_autores) {
    return formatSearchAutores(p.search_autores);
  }

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

// ─── Componente principal ─────────────────────────────────────────────────

export default function BuscaProcessosClient({
  processos,
  paginaAtual,
  totalPaginas,
  totalProcessos,
  filtrosAtivos,
}: {
  processos: ProcessoEmendaRow[];
  paginaAtual: number;
  totalPaginas: number;
  totalProcessos: number;
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

      {/* Banner Institucional: Módulo Terceiro Setor */}
      <div className="mx-auto max-w-5xl px-4 mb-4">
        <Link href="/entidades" className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Painel de Transparência: Terceiro Setor
              </h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Acesse a relação oficial de Organizações da Sociedade Civil (OSCs) e ONGs contempladas com repasses e emendas parlamentares, em conformidade com as diretrizes do Ministério Público.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:underline sm:shrink-0 whitespace-nowrap">
            Acessar Painel Oficial <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      {/* Listagem Exploratória (SSR Filtrada) */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mt-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Listagem Geral (Últimos Processos)
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalProcessos} processo{totalProcessos !== 1 ? "s" : ""} encontrado{totalProcessos !== 1 ? "s" : ""}
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
                <th className="px-4 py-3">Status</th>
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
                  <td className="px-4 py-4">
                    <StatusBadge status={p.situacao_atual || "Em Formalização"} />
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="font-mono text-sm font-semibold text-foreground truncate max-w-[50%]">
                  {p.num_formatado}
                </span>
                <div className="shrink-0">
                  <StatusBadge status={p.situacao_atual || "Em Formalização"} />
                </div>
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

        {totalPaginas > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => {
                const sp = new URLSearchParams(window.location.search);
                sp.set("page", String(paginaAtual - 1));
                router.push(`${pathname}?${sp.toString()}`);
              }}
              disabled={paginaAtual <= 1}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-muted transition-colors cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <button
              onClick={() => {
                const sp = new URLSearchParams(window.location.search);
                sp.set("page", String(paginaAtual + 1));
                router.push(`${pathname}?${sp.toString()}`);
              }}
              disabled={paginaAtual >= totalPaginas}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-muted transition-colors cursor-pointer"
            >
              Próxima
            </button>
          </div>
        )}
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
