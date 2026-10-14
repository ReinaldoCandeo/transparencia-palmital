# Constituição do Projeto — Transparência Palmital

Regras inegociáveis. Violação = rejeitar o diff.

## Stack real (não sugerir nada fora dela)
- Next.js 16 (App Router, `src/app`) + React 19 + TypeScript `strict`.
- UI: Tailwind v4 + Radix UI (`src/components/ui`, estilo shadcn) + lucide-react + sonner.
- Dados: Supabase (Postgres + RLS). Cache de cliente: TanStack Query. Formulários: react-hook-form + Zod.
- Fonte externa: API 1Doc (`src/lib/onedoc.ts`), sincronizada por cron (GitHub Actions), webhook e scripts.
- Observabilidade: Sentry. Deploy: Vercel. Interceptação de requests: `src/proxy.ts` (CSP + auth `/admin`).
- NÃO existem: Docker, Prisma/Drizzle, testes automatizados (ainda), Vite/TanStack Start (restos no `package.json`/`tsconfig` são legado).

## Segurança (prioridade máxima)
1. `supabaseAdmin` (service role, `src/lib/db-admin.ts`) só em route handlers **autenticados** e scripts CLI. Nunca em página pública ou Client Component.
2. Toda rota `src/app/api/**` que escreve, sincroniza ou gasta cota da 1Doc EXIGE segredo (`Authorization: Bearer`) comparado em tempo constante. Segredo nunca em query string nova.
3. Todo input externo (query, body, webhook, resposta da 1Doc) passa por Zod (`safeParse`) antes de uso. Sem `JSON.parse` solto.
4. Anexos marcados como sensíveis (`isAnexoSensivel`) nunca são expostos publicamente.
5. Sem `dangerouslySetInnerHTML` com dado externo sem sanitização.
6. Nunca commitar `.env*`; nunca logar tokens, hashes de auth ou dados pessoais.

## Tipagem e código
- Proibido `any` / `as any` / `@ts-ignore` em código novo. Use `unknown` + Zod ou tipos inferidos (`z.infer`).
- `catch (e: unknown)`; narrow antes de usar `.message`.
- Schemas Zod ficam em `src/lib/schemas.ts`; tipos derivam deles, nunca duplicados à mão.
- Imports via alias `@/`. Sem imports relativos `../../`.
- Sem `console.log` em código de produção; use `console.warn/error` com contexto ou Sentry.
- Funções puras de extração/normalização em `src/lib/*`; componentes não contêm regra de negócio.

## Nomenclatura
- Arquivos de componente: `PascalCase.tsx` (`src/components/portal`). Libs: `kebab-case.ts`/`camelCase.ts` como já existe; não renomear sem pedido.
- Variáveis/funções: `camelCase`. Tipos/Schemas: `PascalCase` / `xxxSchema`. Constantes: `UPPER_SNAKE`.
- Colunas do banco e domínio: `snake_case` em português (`id_assunto`, `situacao_atual`). UI em pt-BR.
- Agrupamento de entidades é SEMPRE por CNPJ, nunca por nome.

## Banco e dados
- Mudança de schema = arquivo `.sql` versionado em `scripts/` (ou pasta de migrations) + RLS revisada. Sem alteração manual no painel sem registrar.
- Upsert por `hash`; operações de sync devem ser idempotentes.
- Regra de negócio: histórico a partir de 2026; economia de storage (não baixar anexo desnecessário).

## Proibido (gera dívida)
- Gambiarras: `setTimeout` para "esperar" dado, `try/catch` vazio, duplicar helper em vez de reutilizar `src/lib`.
- Novos scripts `test-*.cjs`/`check*.ts` soltos na raiz: use `scripts/` e apague após uso.
- Dependência nova sem justificar (peso + alternativa existente).
- Código morto, `TODO` sem dono, comentários narrando o óbvio.
- Refatoração não pedida fora do escopo do diff.

## Git
- Fluxo: nova branch a partir da `main` → mudanças → merge na `main` → deletar branch. Nunca reescrever histórico já publicado (projeto sincroniza com Lovable; ver `AGENTS.md`).

## Definition of Done
`npx tsc --noEmit` limpo, `npm run lint` limpo, `npm run build` ok, caminho triste verificado, sem segredo no diff.
