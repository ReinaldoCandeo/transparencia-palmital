---
description: Fase 5 — Validação de qualidade, commit semântico e envio da branch (sem auto-merge)
---

# /5-ship

Rodar após `/3-audit` APROVADO e `/4-humanize` concluído. Não pule gates.
NUNCA faça merge automático na `main` nem apague a branch automaticamente (pois o merge na `main` dispara deploy automático em produção na Vercel).

1. `git status` deve estar limpo; `git branch --show-current` ≠ `main` (nunca commitar direto na `main`).
2. Gates locais obrigatórios (executar a partir do diretório do projeto):
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm test` (se configurado)
   - `npm run build`
   *Qualquer falha → pare imediatamente e reporte o erro.*
3. Env check: toda variável nova está em `.env.example`, no painel da Vercel (Preview + Production) e validada em `src/lib/env.ts`? Se não, avise o usuário.
4. Segredos: verificar se o diff não contém tokens, chaves ou arquivos `.env*`.
5. Commitar de forma semântica (ex.: `feat: ...`, `fix: ...`).
6. Enviar branch: `git push -u origin <branch>`.
7. **PARAR AQUI**: Não faça checkout para a `main`, não faça merge e não delete a branch.
8. Exibir resumo completo ao usuário contendo:
   - Resumo das mudanças enviadas e status dos gates;
   - Link / comando para criação de Pull Request ou merge manual aprovado pelo usuário;
   - Instruções de verificação do deploy de Preview na Vercel (`/api/health` = 200).
