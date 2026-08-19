"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/db-client";
import { ChevronDown, ChevronUp, FileText, ExternalLink, Calendar, Banknote } from "lucide-react";
import Link from "next/link";

interface Entidade {
  cnpj: string;
  nome_oficial: string;
  apelido: string | null;
  qtd_processos: number;
  valor_total: number;
}

export function EntidadeAccordion({ entidade, posicao }: { entidade: Entidade; posicao: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return `${cnpj.substring(0, 2)}.${cnpj.substring(2, 5)}.${cnpj.substring(5, 8)}/${cnpj.substring(8, 12)}-${cnpj.substring(12, 14)}`;
  };

  const { data: processos, isLoading } = useQuery({
    queryKey: ["emendas-entidade", entidade.cnpj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos_emendas")
        .select("hash, num_formatado, assunto, data, search_valor_global, origem_setor")
        .eq("search_cnpj", entidade.cnpj)
        .eq("search_categoria", "terceiro_setor")
        .order("data", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-emerald-500/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/30 cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold">
            {posicao}º
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">
              {entidade.apelido || entidade.nome_oficial}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{formatCNPJ(entidade.cnpj)}</span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {entidade.qtd_processos} repasse{entidade.qtd_processos !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Recebido</span>
            <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(entidade.valor_total)}
            </p>
          </div>
          <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border bg-muted/20 px-5 py-4 animate-in slide-in-from-top-2">
          {/* Mobile display for total amount */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 p-3 sm:hidden dark:border-emerald-900/30 dark:bg-emerald-900/10">
            <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-500">Valor Total Recebido</span>
            <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(entidade.valor_total)}</span>
          </div>

          <h5 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Banknote className="h-4 w-4" /> 
            Detalhamento de Repasses
          </h5>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(entidade.qtd_processos > 3 ? 3 : entidade.qtd_processos)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {processos?.map((proc) => (
                <Link
                  key={proc.hash}
                  href={`/processos/${proc.hash}`}
                  className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700 sm:flex-row sm:items-center"
                >
                  <div className="mb-2 sm:mb-0">
                    <span className="font-mono text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {proc.num_formatado}
                    </span>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {proc.assunto}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {proc.data}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5">
                        {proc.origem_setor}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(proc.search_valor_global || 0)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-emerald-600">
                      Ver Processo <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
              
              {processos?.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Os processos desta entidade ainda não foram indexados no detalhamento.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
