# Relatório de Auditoria e Atualização: Formulários 1Doc

**Data:** 12 de Agosto de 2026
**Objetivo:** Garantir a retrocompatibilidade do Portal da Transparência de Palmital com as mudanças promovidas nos formulários da 1Doc, além de alinhar o portal às exigências fiscais do TCESP e do MPSP.

---

## 1. Análises e Auditorias Realizadas

### 1.1 Checklist do Ministério Público (MPSP)
Validamos que o portal já atende aos requisitos primários de exibição exigidos pelo MPSP, como a rota de detalhes com timeline contendo laudos técnicos, demonstrativos e prestação de contas.

### 1.2 Plano Diretor de Compliance (TCESP - Audesp)
Fizemos a auditoria das regras sistêmicas de conformidade do TCE-SP. 
**Descoberta Crítica (Radical Candor):** O Tribunal exige amarrações oficiais da Fonte de Recursos e do Código de Aplicação. Se a conta bancária não for cadastrada com esses metadados, o balancete da prefeitura é bloqueado (Regra de validação 47.4.63). 
**Decisão:** Foi exigido e documentado que a **Fase 3** do funil (preenchimento restrito à Tesouraria na 1Doc) seja implementada para garantir que o sistema puxe essas tags, mantendo a leitura contábil oficial blindada (Single Source of Truth).

### 1.3 Análise Comparativa do "Novo Form"
Identificamos os seguintes choques entre o Formato Antigo e o Formato Novo do fluxo da 1Doc:
- **Rateio de Autores:** O modelo antigo usava string contínua com chaves delimitadas por `;` (Ex: `Nº da Emenda: X ; Autor: Y ; Valor: Z`). O novo formulário usa separação simples por `-`.
- **Datas / Ano:** O novo formulário pode possuir chaves concorrentes como `Nº da Emenda / Ano` e `Ano de execução`.
- **Nº da Proposta e Espelho:** Emendas do Terceiro Setor (Ex: ID 1915740) pararam de registrar Lei/Portaria para exigir `Nº Espelho da Programação` e `Proposta`.

---

## 2. Refatorações Implementadas (Código-Fonte)

Criamos uma *branch* exclusiva de correção (`feature/suporte-novos-forms-1doc`) contendo atualizações defensivas no TypeScript:

### 2.1 Robustez do Bloco de Autores (Regex Multi-Formato)
- **Arquivo:** `src/lib/emendaUtils.ts` (Função `extractRateioAutores`)
- **Ação:** O extrator agora testa a string primeiramente contra a Expressão Regular do modelo novo (hifens). Caso falhe, aciona automaticamente o fallback para a Regex legada.
- **Impacto:** Protege a indexação do banco, garantindo que nenhum autor fique órfão, independentemente da época do processo.

### 2.2 Conflito do Extrator de Ano (Peso de Prioridade)
- **Arquivo:** `src/lib/search-extractors.ts` (Função `extractAnoEmenda`)
- **Ação:** O sistema não extrai mais o "primeiro ano" que encontrar. Foi aplicada uma ordem de peso que busca primariamente campos financeiros (`Ano de Execução`, `Exercício`). Apenas em último caso busca datas administrativas (`Ano da Emenda`).

### 2.3 Interface Gráfica e Whitelists (Terceiro Setor)
- **Arquivo:** `src/components/portal/EmendaBlocks.tsx`
- **Ações:**
  1. Adicionamos `proposta` nas listas de permissão do frontend (`WHITELIST_TERCEIRO_SETOR` e `WHITELIST_MUNICIPAL`), permitindo que a interface renda convênios da Plataforma TransfereGov.
  2. Separamos as lógicas visuais de **Lei/Portaria** e **Nº Espelho** no componente `EmendaTerceiroSetorBlock`, extinguindo o bug que renderizava o número do espelho com a nomenclatura falsa de Lei.

---

## 3. Estado Atual
Todas as lógicas foram validadas pelo compilador do TypeScript (`npx tsc`). A aplicação está estritamente tipada, em conformidade com as regras antigas e com as novas formatações de string.
