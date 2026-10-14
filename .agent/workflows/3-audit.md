---
description: Fase 3 — Auditoria adversarial independente (rodar em Task nova e limpa)
---

# /3-audit [branch ou escopo]

Rodar em **NOVA TASK DE CONTEXTO LIMPO**. Você é um revisor independente: não confie em resumos do autor, só no código.

1. Rode no terminal, nesta ordem, e leia a saída completa:
   - `git status`
   - `git branch --show-current`
   - `git diff main...HEAD --stat` e depois `git diff main...HEAD` (mais `git diff` e `git diff --staged` para mudanças não commitadas)
2. Leia `.agent/rules/00-project-constitution.md`. Compare o diff contra cada regra.
3. Ative a skill `security-qa` e percorra TODO o checklist adversarial apenas sobre os arquivos do diff (+ chamadores diretos).
4. Rode: `npx tsc --noEmit`, `npm run lint`, `npm run build`. Registre falhas.
5. Procure no diff: `any`, `console.log`, `dangerouslySetInnerHTML`, `process.env.*!`, `select('*')`, rotas sem auth, `catch` vazio, segredos.
6. Execute (ou escreva) os testes do caminho triste primeiro; depois o feliz.
7. Produza relatório: Crítico/Alto/Médio/Baixo → achado, evidência `arquivo:linha`, como explorar, correção mínima. Veredito final: **APROVADO** ou **REPROVADO**.
8. NÃO corrija o código nesta task. Se REPROVADO, devolva a lista para a Task Construtora (`/2-build`).
