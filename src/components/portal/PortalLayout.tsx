"use client";

import Link from "next/link";
import { Building2, Moon, Sun, Scale } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function PortalLayout({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("portal-theme");
    const initial = stored === "dark"; // Modo claro por padrão se não houver preferência salva
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("portal-theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Faixa institucional */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
          <span className="opacity-90">Governo Municipal · Portal Oficial</span>
          <span className="hidden sm:inline opacity-80">
            Lei 14.133/2021 · LAI 12.527/2011 · LGPD 13.709/2018
          </span>
        </div>
      </div>

      {/* Cabeçalho */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:flex sm:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Prefeitura Municipal
              </p>
              <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
                Palmital · SP
              </h1>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Consulta Pública
              </Link>
              <a
                href="#lgpd"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                LAI / LGPD
              </a>
              <a
                href="#"
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                e-SIC
              </a>
            </nav>
            <button
              onClick={toggle}
              aria-label="Alternar tema"
              className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span>Portal da Transparência · Prefeitura Municipal de Palmital / SP</span>
            </div>
            <p className="text-xs">
              Publicado em conformidade com a Lei nº 14.133/2021 e Lei nº 12.527/2011.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}