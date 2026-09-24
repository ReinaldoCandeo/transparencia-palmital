import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card mt-12 py-8 relative z-10">
      <div className="mx-auto max-w-5xl px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex flex-col items-center md:items-start text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">
            Portal da Transparência
          </p>
          <p>Prefeitura Municipal de Palmital / SP</p>
          <p className="text-xs mt-2 opacity-70">
            Versão 3.4.0 — Sincronização e Auditoria Ativas
          </p>
        </div>

        {/* Selos de Compliance (Placeholders) */}
        <div className="flex items-center gap-4 text-muted-foreground opacity-60 grayscale hover:opacity-100 transition-opacity">
          <div className="flex flex-col items-center gap-1" title="Tribunal de Contas do Estado de São Paulo">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-[10px] font-bold">TCE-SP</span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col items-center gap-1" title="Controladoria-Geral da União">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-[10px] font-bold">CGU</span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col items-center gap-1" title="Ministério Público do Estado de São Paulo">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-[10px] font-bold">MPSP</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
