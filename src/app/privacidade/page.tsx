import { PortalLayout } from "@/components/portal/PortalLayout";

export const dynamic = "force-dynamic";

export default function PrivacidadePage() {
  return (
    <PortalLayout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-bold text-foreground">Termos de Uso e Privacidade</h1>
          <p className="mt-2 text-muted-foreground">
            Conheça as políticas de tratamento de dados e transparência do município.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">Lei de Acesso à Informação (LAI)</h2>
            <p className="mb-3">
              Em cumprimento à Lei Federal nº 12.527/2011 (Lei de Acesso à Informação), 
              este portal disponibiliza proativamente informações de interesse coletivo ou geral 
              produzidas e custodiadas pela administração municipal, assegurando o direito fundamental 
              de acesso à informação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Lei Geral de Proteção de Dados (LGPD)</h2>
            <p className="mb-3">
              De acordo com a Lei Federal nº 13.709/2018 (LGPD), o município adota medidas para proteger 
              os dados pessoais dos cidadãos. Nos processos administrativos aqui publicados, aplicamos 
              técnicas de higienização de dados e anonimização quando necessário, ocultando informações 
              sensíveis ou de identificação pessoal restrita de servidores e munícipes que não possuam 
              justificativa de interesse público para divulgação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Coleta de Dados e Cookies</h2>
            <p className="mb-3">
              Este Portal da Transparência <strong>não utiliza cookies de rastreamento (tracking)</strong> 
              nem ferramentas de analytics intrusivas. O único armazenamento local realizado 
              ocorre através do <code>localStorage</code> do navegador, utilizado 
              exclusivamente para memorizar a sua preferência de tema (Modo Claro/Escuro), 
              não havendo coleta de dados pessoais ou identificação de navegação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Atualização de Informações</h2>
            <p>
              O conteúdo deste portal é sincronizado continuamente com os sistemas oficiais 
              da Prefeitura. Divergências temporárias podem ocorrer devido a atrasos normais 
              de sincronização ou rotinas de auditoria de dados.
            </p>
          </section>
        </div>
      </div>
    </PortalLayout>
  );
}
