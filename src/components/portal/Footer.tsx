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

      </div>
    </footer>
  );
}
