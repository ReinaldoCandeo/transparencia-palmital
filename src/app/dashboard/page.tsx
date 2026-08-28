import { supabase } from "@/lib/db-client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { DashboardCharts } from "@/components/portal/DashboardCharts";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Executa as 3 queries RPC em paralelo
  const [statusRes, entidadesRes, evolutionRes] = await Promise.all([
    supabase.rpc('get_processos_status_count'),
    supabase.rpc('get_top_entidades_valor'),
    supabase.rpc('get_processos_evolution')
  ]);

  return (
    <PortalLayout>
      <section className="bg-primary pt-24 pb-12 sm:pt-32 sm:pb-16 text-primary-foreground relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Painel Analítico Público
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Sala de Situação: Terceiro Setor
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/85 sm:text-base">
              Visão agregada e em tempo real dos repasses e emendas parlamentares municipais.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 -mt-12 relative z-20">
        <DashboardCharts 
          statusData={statusRes.data || []}
          entidadesData={entidadesRes.data || []}
          evolutionData={evolutionRes.data || []}
        />
      </div>
    </PortalLayout>
  );
}
