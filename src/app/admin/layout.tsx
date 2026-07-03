import { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, LogOut, LayoutDashboard, Settings } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // TODO (Fase 2): Adicionar Middleware de Autenticação (NextAuth ou Supabase Auth)
  // para proteger todas as rotas filhas de /admin
  
  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar Administrativa */}
      <aside className="w-64 border-r border-border bg-card hidden md:block">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="grid h-8 w-8 place-items-center rounded bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-semibold text-foreground">Painel Admin</span>
        </div>
        
        <nav className="p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
            <LayoutDashboard className="h-4 w-4" />
            Visão Geral
          </Link>
          <Link href="/admin/config" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <Settings className="h-4 w-4" />
            Configurações LGPD
          </Link>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <h2 className="text-sm font-medium text-muted-foreground">Sistema de Administração - Fase 2 (Previsto)</h2>
          <button className="flex items-center gap-2 text-sm font-medium text-destructive hover:underline">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </header>
        
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
