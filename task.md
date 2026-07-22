# Task: Fix Vercel Build Errors

- [x] 1. Corrigir `next.config.mjs` (remover chave `eslint` deprecated)
- [x] 2. Commit na feature branch
- [x] 3. Merge da feature branch na `main` + push
- [x] 4. Verificar novo deploy na Vercel

## Fase 1 - Motores de Sincronização

- [x] **Passo 1: O Trator (Carga Inicial)**
  - [x] Modificar `scripts/sync-carga-inicial.ts`
  - [x] Buscar as 15 primeiras páginas na 1Doc e pegar os IDs das emendas
  - [x] Buscar os detalhes dos formulários usando `obterDetalheInterno` (resolvendo a falta de dados no list)
  - [x] Preservar campos básicos da paginação (como `num_formatado`) mesclando com os detalhes
  - [x] Tratar `id_assunto` como String->Number usando `z.coerce`
  - [x] Fazer o upsert no Supabase via `dbAdmin` com bypass no RLS

- [x] **Passo 2: O Relógio (Cron Diário)**
  - [x] Modificar `src/app/api/cron/sync/route.ts`
  - [x] Restringir busca apenas à página 1
  - [x] Garantir busca de detalhes para ter os formulários
  - [x] Validação rigorosa `CRON_SECRET`
  - [x] Try/Catch cego (HTTP 200)

- [ ] **Passo 3: A Vitrine (Refatoração do Frontend)**eploy na Vercel
