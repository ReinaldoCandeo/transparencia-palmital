"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { X, Search, Target, SlidersHorizontal, Loader2, ChevronDown } from "lucide-react";

const OPCOES_CATEGORIA = [
  { value: "", label: "Todas as Categorias" },
  { value: "saude", label: "🏥 Saúde" },
  { value: "terceiro_setor", label: "🤝 Terceiro Setor" },
  { value: "esporte", label: "⚽ Esporte" },
];

const OPCOES_ESFERA = [
  { value: "", label: "Todas as Esferas" },
  { value: "Federal", label: "Federal" },
  { value: "Estadual", label: "Estadual" },
  { value: "Municipal", label: "Municipal" },
];

const anoAtual = new Date().getFullYear();
const OPCOES_ANO = [
  { value: "", label: "Todos os Anos" },
  ...Array.from({ length: anoAtual - 2022 }, (_, i) => {
    const ano = String(anoAtual - i);
    return { value: ano, label: ano };
  }),
];

export interface FiltrosAtivos {
  ano: string;
  categoria: string;
  esfera: string;
  autor: string;
  entidade: string;
  cnpj: string;
}

export function PainelBuscaUnificado({
  filtrosAtivos,
}: {
  filtrosAtivos: FiltrosAtivos;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Estados da Busca Exata (Acesso Direto)
  const [termoBusca, setTermoBusca] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const temFiltroAtivo = Object.values(filtrosAtivos).some(Boolean);

  // ─── Handlers de Filtros de Listagem ────────────────────────────────────────

  const handleChange = (chave: string, valor: string) => {
    const params = new URLSearchParams(window.location.search);
    if (valor) {
      params.set(chave, valor);
    } else {
      params.delete(chave);
    }
    params.delete("pagina");
    
    // CORREÇÃO UX: { scroll: false } impede que a tela pule para o topo ao filtrar
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleLimpar = () => router.push(pathname, { scroll: false });

  // ─── Handler de Busca Exata (Acesso Direto) ───────────────────────────────

  const handleBuscaDireta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    if (!termoBusca.trim()) return;

    // Higienização
    const cleanInput = termoBusca.replace(/\s+/g, "").replace(/[\.\-\,]/g, "/");
    const parts = cleanInput.split("/").filter(Boolean);
    const num = parts[0];
    const ano = parts[1] || "";

    if (!num) {
      setSearchError("Formato inválido. Digite apenas números.");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/processos/busca-direta?numero=${num}&ano=${ano}`);
      if (!res.ok) {
        setSearchError("Processo não encontrado no ano informado.");
        setIsSearching(false);
        return;
      }
      const data = await res.json();
      if (data.hash) {
        // Redireciona direto para o processo
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
    <div className="mx-auto max-w-5xl px-4 relative z-10 -mt-8 sm:-mt-12 mb-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5 ring-1 ring-black/5">
        
        <div className="grid gap-8 md:grid-cols-2 md:divide-x md:divide-border">
          
          {/* COLUNA ESQUERDA: Acesso Direto */}
          <div className="flex flex-col md:pr-6">
            <div className="mb-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Acesso Direto
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sabe o número do documento? Vá direto para ele.
              </p>
            </div>

            <form onSubmit={handleBuscaDireta} className="flex flex-col gap-2 relative mt-auto">
              <div className="flex flex-col sm:flex-row items-start gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    placeholder="Ex: 2504 ou 2504/2026"
                    className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full sm:w-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-70 transition-colors h-[38px]"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando
                    </>
                  ) : (
                    "Buscar"
                  )}
                </button>
              </div>

              {/* Feedback de Erro: Renderizado diretamente abaixo do input, dentro do painel */}
              {searchError && (
                <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1">
                  {searchError}
                </div>
              )}
            </form>
          </div>

          {/* COLUNA DIREITA: Filtros de Listagem */}
          <div className="flex flex-col md:pl-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtrar Listagem
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Explore os processos de forma avançada.
                </p>
              </div>
              {temFiltroAtivo && (
                <button
                  onClick={handleLimpar}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
              <FiltroSelect
                label="Categoria"
                value={filtrosAtivos.categoria}
                onChange={(v) => handleChange("categoria", v)}
                options={OPCOES_CATEGORIA}
              />
              <FiltroSelect
                label="Esfera"
                value={filtrosAtivos.esfera}
                onChange={(v) => handleChange("esfera", v)}
                options={OPCOES_ESFERA}
              />
              <FiltroSelect
                label="Ano"
                value={filtrosAtivos.ano}
                onChange={(v) => handleChange("ano", v)}
                options={OPCOES_ANO}
              />
              <div className="col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-3">
                 <FiltroAutorInput
                  value={filtrosAtivos.autor}
                  onCommit={(v) => handleChange("autor", v)}
                />
              </div>
              <div className="col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-2">
                <FiltroTextInput
                  id="filtro-entidade"
                  label="Entidade Beneficiada"
                  value={filtrosAtivos.entidade}
                  placeholder="Ex: Associação Palmital..."
                  onCommit={(v) => handleChange("entidade", v)}
                />
              </div>
              <div className="col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-1">
                <FiltroTextInput
                  id="filtro-cnpj"
                  label="CNPJ"
                  value={filtrosAtivos.cnpj}
                  placeholder="Ex: 44.543.981/0001-99"
                  maxLength={18}
                  onCommit={(raw) => {
                    // Remove máscara antes de injetar na URL: URL limpa com só dígitos
                    const digits = raw.replace(/[.\-\/]/g, "").trim();
                    handleChange("cnpj", digits);
                  }}
                />
              </div>
            </div>

            {temFiltroAtivo && (
              <ActiveFiltersChips
                filtrosAtivos={filtrosAtivos}
                onRemove={(chave) => handleChange(chave, "")}
              />
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}

function FiltroTextInput({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onCommit: (v: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-xs font-medium text-foreground w-full">
      {label}
      <input
        id={id}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit((e.target as HTMLInputElement).value.trim());
          }
        }}
        onBlur={(e) => onCommit(e.target.value.trim())}
        className="w-full rounded-md border border-input bg-background py-2 px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50 placeholder:text-muted-foreground/50 transition-colors"
      />
    </label>
  );
}
// ─── Sub-componentes ──────────────────────────────────────────────────────────

function FiltroSelect({
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-foreground w-full relative" ref={containerRef}>
      {label}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-full flex items-center justify-between rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50 transition-colors"
      >
        <span className="truncate block">{selectedOption.label}</span>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
          <ChevronDown className={`h-4 w-4 opacity-70 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[100%] left-0 w-full mt-1 z-50 rounded-md border border-input bg-card shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 overflow-hidden">
          <ul className="max-h-60 overflow-auto p-1">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rounded-sm px-2 py-1.5 text-sm transition-colors flex items-center ${
                    o.value === value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </label>
  );
}

function FiltroAutorInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-foreground w-full">
      Autor (Vereador / Parlamentar)
      <div className="relative">
        <input
          type="text"
          defaultValue={value}
          placeholder="Ex: Marcelo Silva"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onCommit((e.target as HTMLInputElement).value.trim());
            }
          }}
          onBlur={(e) => onCommit(e.target.value.trim())}
          className="w-full rounded-md border border-input bg-background py-2 px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50 placeholder:text-muted-foreground/50 transition-colors"
        />
      </div>
    </label>
  );
}

function ActiveFiltersChips({
  filtrosAtivos,
  onRemove,
}: {
  filtrosAtivos: FiltrosAtivos;
  onRemove: (chave: string) => void;
}) {
  const LABELS: Record<string, string> = {
    ano: "Ano",
    categoria: "Categoria",
    esfera: "Esfera",
    autor: "Autor",
    entidade: "Entidade",
    cnpj: "CNPJ",
  };

  const CATEGORIA_LABELS: Record<string, string> = {
    saude: "Saúde",
    terceiro_setor: "Terceiro Setor",
    esporte: "Esporte",
  };

  const ativos = Object.entries(filtrosAtivos).filter(([, v]) => Boolean(v));

  return (
    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border">
      {ativos.map(([chave, valor]) => (
        <span
          key={chave}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 pl-2.5 pr-1 py-0.5 text-[11px] font-medium text-primary border border-primary/20"
        >
          <span className="opacity-70">{LABELS[chave]}:</span>
          {chave === "categoria" ? (CATEGORIA_LABELS[valor] ?? valor) : valor}
          <button
            onClick={() => onRemove(chave)}
            className="ml-0.5 grid h-4 w-4 place-items-center rounded-full hover:bg-primary/20 transition-colors"
            aria-label={`Remover filtro ${LABELS[chave]}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
