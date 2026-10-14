---
description: Fase 1 — Especificar antes de codar (Spec-First)
---

# /1-spec <descrição da feature ou correção>

Rodar na **Task Construtora**. Não escreva código de produção neste passo.

1. Rode `git status` e `git branch --show-current`. Se estiver na `main`, crie branch: `git checkout -b <tipo>/<slug>` (nunca trabalhar direto na `main`).
2. Leia `.agent/rules/00-project-constitution.md`.
3. Ative a skill `spec-architect`.
4. Inspecione o estado real: `src/lib/schemas.ts`, `src/lib/sync-core.ts`, rota/página afetada e SQL em `scripts/`.
5. Escreva `docs/specs/<slug>.md` com: problema, regra de negócio, modelo de dados/RLS, schemas Zod, status HTTP, casos de borda, migração, plano de testes (triste primeiro), fora de escopo.
6. Quebre em tarefas numeradas e pequenas (≤ 1 arquivo-chave cada).
7. PARE e apresente a spec. Aguarde aprovação explícita do usuário antes de `/2-build`.
