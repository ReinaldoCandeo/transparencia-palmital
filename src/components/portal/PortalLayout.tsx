"use client";

import Link from "next/link";
import { Building2, Moon, Sun, Scale, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function PortalLayout({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const NavLinks = () => (
    <>
      <Link
        href="/"
        className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Consulta Pública
      </Link>
      <Link
        href="/entidades"
        className="block rounded-md px-3 py-2 text-emerald-600 font-medium hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-colors"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Terceiro Setor
      </Link>
      <Link
        href="/privacidade"
        className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        LAI / LGPD
      </Link>
      <Link
        href="/acessibilidade"
        className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Acessibilidade
      </Link>
      <a
        href={process.env.NEXT_PUBLIC_ESIC_URL || "#"}
        target={process.env.NEXT_PUBLIC_ESIC_URL ? "_blank" : "_self"}
        rel="noopener noreferrer"
        className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        e-SIC
      </a>
    </>
  );

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
      <header className="border-b border-border bg-card relative">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex shrink-0 items-center gap-2">
            <nav className="flex items-center gap-1 text-sm">
              <NavLinks />
            </nav>
            <button
              onClick={toggle}
              aria-label="Alternar tema"
              className="ml-2 grid h-9 w-9 place-items-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggle}
              aria-label="Alternar tema"
              className="grid h-10 w-10 place-items-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
              className="grid h-10 w-10 place-items-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-4 absolute w-full shadow-lg z-50">
            <nav className="flex flex-col gap-2 text-sm font-medium">
              <NavLinks />
            </nav>
          </div>
        )}
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