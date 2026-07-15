"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Search,
  ArrowRight,
  FileText,
  ShieldCheck,
  Building,
  Target,
  Clock3,
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

// ─── Mapeamento de tipagem (Radar) ────────────────────────────────────────

function mapearProcesso(raw: any): ProcessoPublico {
  return {
    hash: raw.hash ?? "",
    num: String(raw.num ?? ""),
    ano: String(raw.ano ?? ""),
    num_formatado: raw.num_formatado ?? "",
    assunto: raw.assunto ?? "",
    data: raw.data ?? "",
    hora: raw.hora ?? "",
    origem_setor: raw.origem_setor ?? "",
    destino_setor: raw.destino_setor ?? "",
    situacao_atual_str: raw.situacao_atual_str ?? "",
    movimentacoes: [],
    anexos: [],
  };
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function BuscaProcessosClient({
  processos,
  paginaAtual,
  totalPaginas,
}: {
  processos: ProcessoPublico[];
  paginaAtual: number;
  totalPaginas: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Modo Radar ────────────────────────────────────────────────────────────
  const ID_ALVO = 1915747;
  const ITENS_META = 15;
  const MAX_PAGINAS = 50;

  const [radarAtivo, setRadarAtivo] = useState(true);
  const [paginaRadar, setPaginaRadar] = useState(1);
  const [processosRadar, setProcessosRadar] = useState<ProcessoPublico[]>([]);

  useEffect(() => {
    let cancelado = false;
  
    (async () => {
      const coletados: ProcessoPublico[] = [];
  
      for (let pag = 1; pag <= MAX_PAGINAS; pag++) {
        if (cancelado) return;
        setPaginaRadar(pag);
  
        const res = await fetch(`/api/processos/bruto?pagina=${pag}`);
        if (!res.ok) break;
  
        const json = await res.json();
        const emissoes: any[] = json?.data?.[0]?.emissoes ?? [];
  
        if (emissoes.length === 0) break; // API sem mais dados
  
        const matches = emissoes
          .filter((e: any) => e.id_assunto === ID_ALVO)
          .map(mapearProcesso);
  
        if (matches.length > 0) {
          coletados.push(...matches);
          // Atualiza a tabela na mesma hora
          setProcessosRadar([...coletados]);
        }
  
        if (coletados.length >= ITENS_META) break;
      }
  
      if (!cancelado) {
        setProcessosRadar(coletados.slice(0, ITENS_META));
        setRadarAtivo(false);
      }
    })();
  
    return () => { cancelado = true; };
  }, []);

  const [buscaDiretaNum, setBuscaDiretaNum] = useState("");
  const [buscaDiretaAno, setBuscaDiretaAno] = useState(
    new Date().getFullYear().toString()
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const anosDisponiveis = Array.from({ length: 10 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );
  const meses = [
    { value: "", label: "Todos os meses" },
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBuscaDireta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    if (!buscaDiretaNum || !buscaDiretaAno) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/processos/busca-direta?numero=${buscaDiretaNum}&ano=${buscaDiretaAno}`
      );
      if (!res.ok) {
        setSearchError("Processo não encontrado no ano informado.");
        setIsSearching(false);
        return;
      }
      const data = await res.json();
      if (data.hash) {
        router.push(`/processos/${data.hash}`);
      } else {
        setSearchError("Processo não localizado na base de dados.");
        setIsSearching(false);
      }
    } catch (err) {
      setSearchError("Erro ao consultar o processo. Tente novamente.");
      setIsSearching(false);
    }
  };

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

            <form onSubmit={handleBuscaDireta} className="mt-8">
              <label className="text-sm font-semibold mb-2 block text-primary-foreground/90">
                <Target className="inline-block w-4 h-4 mr-1 mb-0.5" />
                Busca Exata por Número e Ano
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl bg-background/10 p-2 text-foreground shadow-lg ring-1 ring-black/5 backdrop-blur-md">
                
                <div className="flex w-full sm:w-auto flex-1 items-center gap-2 pl-2 bg-background rounded-lg">
                  <Search className="h-5 w-5 text-muted-foreground ml-2" />
                  <input
                    type="number"
                    required
                    value={buscaDiretaNum}
                    onChange={(e) => setBuscaDiretaNum(e.target.value)}
                    placeholder='Número (ex: 2504)'
                    className="w-full bg-transparent py-2.5 px-2 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
                  />
                </div>

                <div className="flex w-full sm:w-32 shrink-0 items-center gap-2 bg-background rounded-lg">
                  <select
                    value={buscaDiretaAno}
                    onChange={(e) => setBuscaDiretaAno(e.target.value)}
                    className="w-full bg-transparent py-2.5 px-3 text-sm outline-none text-foreground"
                  >
                    {anosDisponiveis.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-lg bg-background text-primary px-6 py-2.5 text-sm font-bold shadow-sm hover:bg-background/90 disabled:opacity-50 inline-flex transition-colors"
                >
                  {isSearching ? "Buscando..." : "Buscar Direto"}
                </button>
              </div>
              {searchError && (
                <p className="mt-2 text-sm font-medium text-red-200 bg-red-900/40 px-3 py-1.5 rounded-md inline-block backdrop-blur border border-red-500/30">
                  {searchError}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Listagem Exploratória (SSR Paginada) */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mt-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Listagem Geral (Últimos Processos)
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Página {paginaAtual} de {totalPaginas}
            </p>
          </div>
        </div>

        {radarAtivo && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            Varrendo processos...{" "}
            <span className="font-mono font-semibold text-muted-foreground ml-auto">
              (Página {paginaRadar}/50 — {processosRadar.length}/15 encontrados)
            </span>
          </div>
        )}

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
              {processosRadar.map((p) => (
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
              {processosRadar.length === 0 && !radarAtivo && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Nenhum processo de Saúde encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <ul className="mt-6 grid gap-4 md:hidden list-none p-0 m-0">
          {processosRadar.map((p) => (
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
          {processosRadar.length === 0 && !radarAtivo && (
            <li className="p-8 text-center text-sm text-muted-foreground border border-border rounded-xl">
               Nenhum processo de Saúde encontrado.
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
