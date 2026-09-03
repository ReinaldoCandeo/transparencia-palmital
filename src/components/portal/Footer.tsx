import { ShieldCheck, Scale, FileSignature } from "lucide-react";

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

        <div className="flex flex-col items-center md:items-end">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Certificações de Compliance
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            
            <div className="flex items-center gap-2 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <ShieldCheck className="w-5 h-5 text-slate-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase leading-none text-slate-600">TCE-SP</span>
                <span className="text-[9px] leading-none text-slate-500 mt-0.5">Auditoria Aprovada</span>
              </div>
            </div>

            <div className="flex items-center gap-2 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <Scale className="w-5 h-5 text-slate-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase leading-none text-slate-600">CGU</span>
                <span className="text-[9px] leading-none text-slate-500 mt-0.5">Transparência Ativa</span>
              </div>
            </div>

            <div className="flex items-center gap-2 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <FileSignature className="w-5 h-5 text-slate-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase leading-none text-slate-600">MPSP</span>
                <span className="text-[9px] leading-none text-slate-500 mt-0.5">TAC Conformidade</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}
