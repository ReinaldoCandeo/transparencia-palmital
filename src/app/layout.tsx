import type { Metadata } from "next";
import "./globals.css";
import { QueryClientProvider } from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "Portal da Transparência · Prefeitura de Palmital/SP",
  description: "Consulta de processos administrativos municipais. Rastro auditável em conformidade com a LGPD e LAI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryClientProvider>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
