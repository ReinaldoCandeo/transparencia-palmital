---
name: infra-deploy
description: Ative ao mexer em deploy Vercel, next.config.mjs, vercel.json, variáveis de ambiente (.env.example), GitHub Actions em .github/workflows (crons), Sentry, headers/CSP, /api/health, logs, ou quando o build/deploy falhar. NÃO ative para lógica de feature, UI, modelagem de dados ou revisão de segurança de código (security-qa).
---

# Infra & Deploy — Vercel + GitHub Actions + Supabase (sem Docker)

Não existe Dockerfile nem compose; **não criar**. Deploy é Vercel (build `next build`), crons são GitHub Actions chamando `/api/cron/sync`.

## Regras
- **Env validadas no boot**: criar/usar `src/lib/env.ts` com Zod (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ONEDOC_BASE_URL`, `ONEDOC_AUTH_HASH`, `CRON_SECRET`, `WEBHOOK_SECRET`, `SENTRY_*`). Falha cedo com mensagem clara. Separar o que é servidor do que é `NEXT_PUBLIC_*`. Mantenha `.env.example` sincronizado (todas as chaves, sem valores). O Vercel recusa nomes de variável que "expõem demais" — as aliases em `next.config.mjs` (`SUPABASE_URL` → `NEXT_PUBLIC_*`) existem por isso; não remova sem checar o painel.
- **Build limpo**: `npm run build` local antes de push; sem chaves deprecated no `next.config.mjs` (o build já quebrou por `eslint` key). Sem `ignoreBuildErrors`.
- **Healthcheck**: `/api/health` retorna só `status`, `lastSync`, `latencyMs`; não expor `os.*`, uptime ou mensagens internas a anônimos. Monitor externo (UptimeRobot/Better Stack) aponta para ele; 503 se dados > 24 h.
- **Crons (GitHub Actions)**: usar `secrets.APP_URL` e `secrets.CRON_SECRET`; `curl -f --max-time` + retry; `concurrency:` group para não rodar duas syncs juntas; nunca imprimir segredo.
- **Logs estruturados**: JSON de uma linha (`{ level, msg, ctx }`) com `console.warn/error`; sem `console.log` decorativo/emoji em produção; Sentry com `captureException` e tags (`route`, `hash`). Nunca logar tokens/PII.
- **Headers**: manter CSP no `proxy.ts` + headers em `next.config.mjs`; qualquer domínio novo entra na CSP explicitamente (sem `*`).
- **Branches**: PR/merge na `main` dispara deploy; Preview por branch. Não reescrever histórico (Lovable).
- **Higiene**: scripts operacionais ficam em `scripts/` com `tsx --env-file=.env.local`; dumps e arquivos `test-*.cjs` da raiz não vão a produção.
- **Zero super-otimização**: sem Docker/K8s/CDN extra/cache layers antes de métrica que prove necessidade. Medir primeiro (Vercel Analytics/Sentry).

## Checklist de ship
- [ ] `tsc`, `lint`, `build` verdes
- [ ] Novas env no Vercel (Preview + Production) e no `.env.example`
- [ ] Health OK após deploy; cron manual (`workflow_dispatch`) responde 200
- [ ] Rollback definido (redeploy anterior no Vercel)
