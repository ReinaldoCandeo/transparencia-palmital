import { FileText, ShieldCheck } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

export default function Loading() {
  return (
    <PortalLayout>
      {/* Hero Section Simplificado (sempre presente) */}
      <section className="bg-primary pt-24 pb-12 sm:pt-32 sm:pb-16 text-primary-foreground relative overflow-hidden">
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

      {/* Placeholder do Painel Flutuante */}
      <div className="relative z-20 mx-auto -mt-8 max-w-5xl px-4 sm:-mt-12 mb-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-6"></div>
          <div className="flex flex-col md:flex-row gap-4">
             <div className="h-10 bg-muted rounded w-full md:w-1/4"></div>
             <div className="h-10 bg-muted rounded w-full md:w-1/4"></div>
             <div className="h-10 bg-muted rounded w-full md:w-1/4"></div>
             <div className="h-10 bg-muted rounded w-full md:w-1/4"></div>
          </div>
        </div>
      </div>

      {/* Listagem Exploratória Skeleton */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mt-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Listagem Geral (Últimos Processos)
            </h3>
            <div className="mt-2 h-4 w-32 bg-muted rounded animate-pulse"></div>
          </div>
        </div>

        {/* Desktop Table Skeleton */}
        <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-card md:block animate-pulse">
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
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-4">
                    <div className="h-4 w-20 bg-muted rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-48 bg-muted rounded mb-2"></div>
                    <div className="h-3 w-32 bg-muted rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-16 bg-muted rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 w-24 bg-muted rounded-full"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="h-8 w-24 bg-muted rounded ml-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="mt-4 grid gap-4 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-24 bg-muted rounded"></div>
                <div className="h-5 w-24 bg-muted rounded-full"></div>
              </div>
              <div className="h-4 w-full bg-muted rounded mb-2"></div>
              <div className="h-4 w-3/4 bg-muted rounded mb-4"></div>
              <div className="h-3 w-32 bg-muted rounded mb-4"></div>
              <div className="h-10 w-full bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </section>
    </PortalLayout>
  );
}
