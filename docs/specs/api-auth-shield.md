# Spec — Blindagem de Autenticação das Rotas Privadas/Cron/Webhook (`api-auth-shield`)

## 1. Contexto e Problema
Auditorias de segurança identificaram fragilidades críticas nas rotas de API do portal:
1. **`GET /api/backfill`**: Rota desprotegida (zero autenticação) que aciona loop demorado (até 300s) de consultas à API da 1Doc e escrita no Supabase.
2. **Comparação insegura de segredos**: Rotas `/api/cron/sync`, `/api/processos/[hash]/despachos`, `/api/processos/bruto` e `/api/webhooks/1doc` realizavam checagem de segredo via operador estrito (`!==` ou `===`), suscetível a ataques de tempo (timing attacks).
3. **Webhook 1Doc com token na query string**: Rota `/api/webhooks/1doc?token=...` expunha segredo na URL, com risco de vazamento em logs de proxy, servidor e relatórios do Sentry.
4. **Risco de bypass por variável indefinida**: Comparações manuais sem garantia estrita de *fail-closed* caso a variável de ambiente não esteja configurada ou venha vazia.

## 2. Regras de Negócio e Solução Proposta

### 2.1 Helper Centralizado (`src/lib/api-auth.ts`)
- **`safeCompareStrings(a: string, b: string): boolean`**:
  - Utiliza `crypto.createHash('sha256')` em ambas as entradas e compara os digests resultantes com `crypto.timingSafeEqual`.
  - Garante tempo constante independente do tamanho ou conteúdo dos valores, prevenindo vazamento de comprimento ou exceções por tamanhos de Buffer divergentes.
  - Retorna `false` imediatamente se qualquer das strings for nula, indefinida ou vazia.
- **`assertSecretAuth(request: Request | NextRequest, envVarName: string, options?: { allowQueryParam?: string; headerName?: string }): NextResponse | null`**:
  - **Fail-Closed**: Se `process.env[envVarName]` for `undefined` ou string vazia, rejeita imediatamente com HTTP 500 (`Server configuration error`), impedindo que falha de configuração exponha rotas protegidas.
  - **Extração Flexível de Credencial**:
    1. Cabeçalho `Authorization: Bearer <token>` (padrão principal).
    2. Cabeçalho customizado (ex: `X-Webhook-Secret`, `X-Cron-Secret` ou via `options.headerName`).
    3. Query param opcional (ex: `?token=...` via `options.allowQueryParam`), mantido exclusivamente para compatibilidade com a 1Doc legada.
  - **Retorno**:
    - Retorna `null` caso autorizado.
    - Retorna `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` caso o token seja inválido ou ausente.
    - Retorna `NextResponse.json({ error: "Configuração do servidor ausente" }, { status: 500 })` em caso de variável de ambiente ausente no servidor.
- **`sanitizeUrlForLogging(url: string | URL): string`**:
  - Remove parâmetros sensíveis (`token`, `secret`, `key`, `auth`) da query string antes de qualquer log ou envio de telemetria.

### 2.2 Rotas Afetadas

| Rota | Método | Autenticação Exigida | Variável de Ambiente | Fallback Query Param |
| :--- | :--- | :--- | :--- | :--- |
| `/api/backfill` | `GET` | `Bearer <CRON_SECRET>` | `CRON_SECRET` | Não |
| `/api/cron/sync` | `GET` | `Bearer <CRON_SECRET>` | `CRON_SECRET` | Não |
| `/api/processos/bruto` | `GET` | `Bearer <CRON_SECRET>` | `CRON_SECRET` | Não |
| `/api/processos/[hash]/despachos` | `GET` | `Bearer <CRON_SECRET>` | `CRON_SECRET` | Não |
| `/api/webhooks/1doc` | `POST` | Header ou `?token=` | `WEBHOOK_SECRET` | Sim (`token`) |

### 2.3 Blindagem do Webhook 1Doc
- Priorizar header `X-Webhook-Secret` ou `Authorization: Bearer <WEBHOOK_SECRET>`.
- Manter suporte ao query param `?token=` por compatibilidade com cadastros preexistentes na 1Doc.
- Garantir que `req.url` / `req.nextUrl` nunca seja logado na íntegra com a query string contendo o token.
- Sanitização no Sentry via hook `beforeSend` para redactar `token` de qualquer URL capturada.

### 2.4 Status HTTP e Casos de Borda
- **401 Unauthorized**: Token ausente ou divergente.
- **500 Internal Server Error**: Variável de ambiente não configurada no servidor (fail-closed).
- **Sem vazamento em URLs**: Logs internos utilizarão `pathname` em vez de `href`/`url`.

## 3. Tarefas de Implementação (Passo a Passo)
1. **Tarefa 1**: Criar `src/lib/api-auth.ts` com `safeCompareStrings`, `assertSecretAuth` e `sanitizeUrlForLogging`.
2. **Tarefa 2**: Proteger `src/app/api/backfill/route.ts` com `assertSecretAuth(req, "CRON_SECRET")` e tipagem estrita de erro.
3. **Tarefa 3**: Atualizar `src/app/api/webhooks/1doc/route.ts` com `assertSecretAuth(req, "WEBHOOK_SECRET", { allowQueryParam: "token", headerName: "x-webhook-secret" })` e sanitização de logs.
4. **Tarefa 4**: Refatorar `src/app/api/processos/[hash]/despachos/route.ts`, `src/app/api/processos/bruto/route.ts` e `src/app/api/cron/sync/route.ts` para usar o helper.
5. **Tarefa 5**: Configurar sanitização de query string em `sentry.server.config.ts` (`beforeSend`).
6. **Tarefa 6**: Atualizar `.env.example` com as variáveis faltantes (`WEBHOOK_SECRET`, etc.).
7. **Tarefa 7**: Validação com `npx tsc --noEmit` e testes de autorização.

## 4. Fora de Escopo
- Alteração na assinatura de payload do webhook 1Doc (o formato Base64 permanece inalterado).
- Mudança na regra de negócio de sincronização do backfill ou cron.
- Criação de novas rotas públicas.
