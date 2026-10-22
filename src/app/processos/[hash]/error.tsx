"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { FileQuestion, RefreshCw, Search, HelpCircle } from "lucide-react";
import { env } from "@/lib/env";

export default function ProcessoDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const esicUrl = env.public.NEXT_PUBLIC_ESIC_URL;

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
      <div className="max-w-lg w-full bg-card text-card-foreground border border-border rounded-xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <FileQuestion className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Não conseguimos abrir os detalhes deste processo
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Não foi possível carregar os dados deste processo agora, possivelmente por uma oscilação na
            conexão ou instabilidade momentânea na consulta ao sistema da 1Doc.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Recarregar processo
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background hover:bg-muted text-foreground font-medium text-sm transition-colors"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            Buscar outros processos
          </Link>
        </div>

        {esicUrl && (
          <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />
            <span>Precisa desta informação com urgência? Solicite via</span>
            <a
              href={esicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              e-SIC Municipal
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
