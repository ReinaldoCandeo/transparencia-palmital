---
description: Fase 2 — Construir a spec aprovada
---

# /2-build [caminho da spec]

Rodar na **Task Construtora**, após spec aprovada.

1. Leia a spec em `docs/specs/` e `.agent/rules/00-project-constitution.md`. Se não há spec aprovada, pare e peça `/1-spec`.
2. Confirme a branch (`git branch --show-current` ≠ `main`).
3. Ordem de execução: (a) migração SQL + RLS → (b) schemas Zod em `src/lib/schemas.ts` → (c) lógica em `src/lib/*` → (d) rotas `src/app/api/**` (skill `backend-api`) → (e) UI (skill `frontend-ui`).
4. Execute UMA tarefa da lista por vez; após cada uma rode `npx tsc --noEmit`. Corrija antes de seguir.
5. Escreva primeiro os cenários do caminho triste (sem auth, input inválido, 1Doc fora); depois o feliz. Valide com `curl` ou testes quando existirem.
6. Sem `any`, sem `console.log`, sem refactor fora do escopo, sem dependência nova não prevista.
7. Ao final: `npm run lint` e `npm run build`. Mostre `git status` e resumo do que mudou, vinculando cada mudança à tarefa da spec.
8. Commit em mensagens pequenas e convencionais (`feat:`, `fix:`). NÃO faça merge. Recomende abrir **nova task limpa** para `/3-audit`.
