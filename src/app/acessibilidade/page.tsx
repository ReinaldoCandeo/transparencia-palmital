import { PortalLayout } from "@/components/portal/PortalLayout";
import { Accessibility } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AcessibilidadePage() {
  return (
    <PortalLayout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-bold text-foreground">Acessibilidade</h1>
          <p className="mt-2 text-muted-foreground">
            Compromisso do Portal da Transparência com a inclusão digital.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">Diretrizes de Acessibilidade</h2>
            <p className="mb-3">
              Este portal foi desenvolvido buscando atender aos padrões do Modelo de 
              Acessibilidade em Governo Eletrônico (e-MAG), em conformidade com o 
              Estatuto da Pessoa com Deficiência (Lei Brasileira de Inclusão - Lei nº 13.146/2015).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Recursos Disponíveis</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>VLibras:</strong> O portal integra o widget oficial do Governo Federal, 
                oferecendo tradução automática dos conteúdos em texto para a Língua Brasileira de Sinais (Libras).
                A ferramenta pode ser ativada clicando no ícone flutuante presente em todas as páginas.
              </li>
              <li>
                <strong>Modo Escuro (Dark Mode):</strong> Disponível para melhorar o conforto visual 
                e auxiliar usuários com fotofobia ou deficiências visuais específicas.
              </li>
              <li>
                <strong>Navegação por Teclado:</strong> Todos os elementos interativos, menus e 
                botões são acessíveis através do uso exclusivo do teclado.
              </li>
              <li>
                <strong>Responsividade:</strong> O design se adapta a diferentes tamanhos de tela, 
                permitindo uso de zoom sem quebra severa da usabilidade.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Reportar Problemas</h2>
            <p>
              Caso encontre alguma barreira de acessibilidade em nosso portal, 
              por favor entre em contato conosco através dos canais oficiais da Prefeitura 
              para que possamos tomar as providências de correção.
            </p>
          </section>
        </div>
      </div>
    </PortalLayout>
  );
}
