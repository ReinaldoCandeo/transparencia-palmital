"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex items-center justify-center p-4">
        <main className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Indisponibilidade Temporária
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ocorreu uma oscilação inesperada no carregamento do portal. O incidente já foi reportado
              automaticamente para nossa equipe técnica e nenhuma informação foi perdida.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-colors shadow-sm flex-1 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Tentar novamente
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-sm transition-colors flex-1"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Página inicial
            </a>
          </div>

          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            Portal da Transparência · Município de Palmital/SP
          </p>
        </main>
      </body>
    </html>
  );
}
