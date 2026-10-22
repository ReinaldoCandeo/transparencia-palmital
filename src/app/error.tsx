"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
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
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[50vh]">
      <div className="max-w-lg w-full bg-card text-card-foreground border border-border rounded-xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Não foi possível carregar as informações agora
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pode haver uma oscilação temporária na conexão ou os servidores de dados estão em
            manutenção. Nenhuma informação foi perdida e você pode tentar novamente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background hover:bg-muted text-foreground font-medium text-sm transition-colors"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
