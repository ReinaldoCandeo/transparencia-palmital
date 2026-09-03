import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/portal/Footer";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal da Transparência · Prefeitura de Palmital/SP",
  description: "Consulta de processos administrativos municipais. Rastro auditável em conformidade com a LGPD e LAI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          {children}
        </Providers>

        <Footer />
        
        {/* VLibras Widget */}
        <div {...{ vw: "true" }} className="enabled">
          <div {...{ "vw-access-button": "true" }} className="active"></div>
          <div {...{ "vw-plugin-wrapper": "true" }}>
            <div className="vw-plugin-top-wrapper"></div>
          </div>
        </div>
        <Script src="https://vlibras.gov.br/app/vlibras-plugin.js" strategy="afterInteractive" />
        <Script id="vlibras-init" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            const initVLibras = () => {
              if (window.VLibras) {
                new window.VLibras.Widget('https://vlibras.gov.br/app');
              } else {
                setTimeout(initVLibras, 500);
              }
            };
            initVLibras();
          `
        }} />
      </body>
    </html>
  );
}
