export default function AdminDashboard() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
      <p className="mt-2 text-muted-foreground">
        Painel de controle administrativo do Portal de Transparência.
      </p>
      
      <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Módulo em Desenvolvimento (Fase 2)</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Este painel será integrado à Instar na Fase 2 para gerenciar políticas de mascaramento (LGPD), 
          auditoria de acessos e acionamento manual do cron job de sincronização com a 1Doc.
        </p>
      </div>
    </div>
  );
}
