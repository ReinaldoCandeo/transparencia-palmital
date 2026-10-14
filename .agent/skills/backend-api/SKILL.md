---
name: backend-api
description: Ative ao criar ou editar route handlers em src/app/api/**, Server Actions, src/lib/sync-core.ts, src/lib/onedoc.ts, src/lib/storage-sync.ts, src/proxy.ts, queries Supabase no servidor ou scripts em scripts/*.ts. NÃO ative para componentes React/estilo (use frontend-ui), revisão de segurança independente (security-qa) ou configuração de deploy (infra-deploy).
---

# Backend API — Next.js 16 Route Handlers + Supabase

## Regras idiomáticas
- Route handlers em `route.ts` exportando `GET/POST` com `NextRequest`/`NextResponse`. Rotas dinâmicas: `export const dynamic = 'force-dynamic'`; defina `maxDuration` explícito em rotas longas.
- Next 16: `proxy.ts` (substitui `middleware.ts`); `params` de rota é `Promise` → `await params`. Trabalho pós-resposta (webhook) com `after()` de `next/server`.
- **Auth primeiro**: primeira linha do handler valida segredo (`Authorization: Bearer ${CRON_SECRET}`) com `crypto.timingSafeEqual`; falta de env → 500/401 fechado (fail-closed). Extraia um helper único `assertCronAuth(req)` em `src/lib/` e reutilize em todas as rotas privadas.
- **Validação**: Zod `safeParse` em query/body/webhook → 400 com mensagem genérica. Respostas da 1Doc validadas com `processoEmendaSchema` antes do upsert.
- **Clientes Supabase**: leitura pública = `db-client.ts` (anon, RLS). Escrita/sync = `db-admin.ts` (service role) somente atrás da auth. Nunca misturar.
- **Upsert idempotente** por `hash` (`onConflict: 'hash'`). Operações repetíveis sem efeito colateral duplicado.
- **Erros**: `catch (e: unknown)`; reportar ao Sentry (`Sentry.captureException`) e responder JSON `{ error: "<mensagem curta>" }` sem stack nem detalhes internos. Códigos corretos: 400 input, 401/403 auth, 404, 429, 502 (1Doc falhou), 503 (dependência fora).
- **Webhook 1Doc**: sempre 200 para payload inválido (evita reenvio infinito), 401 para token errado; processar em `after()`.
- **Custo/limites**: paginar, limitar `limit()`, respeitar rate da 1Doc (delays existentes em `onedoc.ts`), `AbortSignal.timeout` em `fetch` externo.
- Select só das colunas necessárias; nunca `select('*')` em rota pública se houver campo sensível/`form_data` pesado.
- Env: leia via módulo central validado (ver infra-deploy), não `process.env.X!` espalhado.

## Checklist antes de entregar
- [ ] Rota privada tem auth fail-closed
- [ ] Input validado com Zod; sem `any`
- [ ] Erro não vaza detalhe interno
- [ ] Idempotente e com timeout
- [ ] `npx tsc --noEmit` + `npm run lint`
