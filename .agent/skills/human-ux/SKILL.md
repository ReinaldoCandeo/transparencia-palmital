---
name: human-ux
description: Ative para revisar ou escrever tudo que o cidadão, gestor ou fiscal VÊ — textos, mensagens de erro, estados de loading/vazio, formulários de busca, fluxos de login/admin, tabelas e acessibilidade — especialmente em /4-humanize. NÃO ative para lógica de servidor, banco, auditoria de segurança (security-qa) ou deploy.
---

# Human UX — pessoas reais, celular fraco, zero jargão

Público: cidadãos de Palmital (muitos em celular, 3G, baixa letramento digital), vereadores, auditores (MPSP/TCE-SP). Leia o diff real e abra a tela afetada.

## Regras
1. **Linguagem**: pt-BR simples. Proibido na tela: "hash", "payload", "endpoint", "500", "null", "undefined", "CNPJ inválido (regex)", stack traces. Termos do domínio com explicação curta ("Emenda parlamentar: dinheiro indicado por um vereador/deputado para uma entidade").
2. **Erro = o que houve + como resolver**: "Não conseguimos carregar as emendas agora. Verifique sua internet e tente de novo. [Tentar novamente]". Nunca tela branca nem erro cru; todo segmento tem `error.tsx` com botão de retry e caminho de volta ao início.
3. **Loading claro**: skeleton/spinner com texto ("Buscando processos…") em toda requisição > 300 ms; botão desabilita e mostra progresso ao enviar; sem layout shift.
4. **Estado vazio útil**: "Nenhum resultado para 'xyz'. Tente o número do processo ou o nome da entidade." com sugestão/limpar filtros.
5. **Menos cliques e digitação**: busca única tolerante (acento, caixa, pontuação de CNPJ/número), filtros pré-selecionados com padrões sensatos, estado na URL (link compartilhável), `inputMode`/`autocomplete` corretos, máscara automática, sem campos redundantes.
6. **Resiliência 3G**: payload pequeno (selecione colunas, pagine), `loading` por seção em vez de página inteira, dados já carregados permanecem visíveis em falha parcial, retry automático com TanStack Query + botão manual, imagens/gráficos sob demanda, sem bloquear conteúdo por script de terceiros (VLibras/Sentry carregam depois).
7. **Mobile primeiro**: alvo de toque ≥ 44 px, tabela larga → cartões ou scroll com indicação, sem hover como única interação.
8. **Acessibilidade**: foco visível, ordem de tab lógica, `aria-live` para resultados/erros, contraste AA, nada só por cor (use texto no `StatusBadge`), compatível com VLibras e leitor de tela.
9. **Confiança**: mostrar "Atualizado em dd/mm/aaaa hh:mm" e fonte (1Doc) onde há dados; valores em R$ formatados; datas dd/mm/aaaa.

## Método
- Passe por: Início, Busca, Detalhe do processo, Entidades, Dashboard, Login/Admin. Simule: offline, 3G lento, resultado vazio, 1Doc fora.
- Reescreva textos diretamente no código quando o diff for pequeno; liste o que mudou. Não altere regra de negócio nem backend.

## Saída
Tabela "Problema → Onde (`arquivo:linha`) → Texto/ajuste proposto → Impacto". Prioridade para o que bloqueia o cidadão.
