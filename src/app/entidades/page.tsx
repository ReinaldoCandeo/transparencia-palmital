import { PortalLayout } from "@/components/portal/PortalLayout";
import { supabase } from "@/lib/db-client";
import { EntidadeAccordion } from "@/components/portal/EntidadeAccordion";
import { Building2, Landmark, HeartHandshake } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaginaTerceiroSetor() {
  // Faz o fetch hiper-rápido na View do PostgreSQL (Agregação já mastigada)
  const { data: ranking, error } = await supabase
    .from("view_ranking_terceiro_setor")
    .select("*")
    .order("valor_total", { ascending: false });

  if (error) {
    console.error("[SSR] Erro ao buscar ranking do terceiro setor:", error);
  }

  const rankingData = ranking || [];

  return (
    <PortalLayout>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground">
        <div
          aria-hidden
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <HeartHandshake className="h-3.5 w-3.5" />
              Transparência Ativa (MPSP)
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Terceiro Setor (ONGs)
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/85 sm:text-base">
              Acompanhe de perto as entidades e Organizações da Sociedade Civil (OSCs)
              que receberam recursos de Emendas Parlamentares ou Repasses Diretos.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Ranking de Repasses
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {rankingData.length} entidade{rankingData.length !== 1 ? "s" : ""} registrada{rankingData.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {rankingData.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p>Nenhuma entidade do Terceiro Setor com repasses localizada.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rankingData.map((entidade, index) => (
              <EntidadeAccordion 
                key={entidade.cnpj} 
                entidade={entidade} 
                posicao={index + 1} 
              />
            ))}
          </div>
        )}
      </section>
    </PortalLayout>
  );
}
