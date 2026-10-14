---
name: frontend-ui
description: Ative ao criar ou editar páginas em src/app/**/page.tsx, layouts, componentes em src/components/portal ou src/components/ui, estilos Tailwind, gráficos Recharts, formulários react-hook-form ou uso de TanStack Query. NÃO ative para route handlers/sync/banco (backend-api), revisão adversarial (security-qa) ou revisão de linguagem e fluxo para leigos (human-ux).
---

# Frontend UI — Next.js 16 App Router + React 19 + Tailwind v4

## Regras idiomáticas
- **Server Component por padrão**. `"use client"` só onde há estado, efeito, evento ou hook de browser — o mais baixo possível na árvore (ex.: `BuscaProcessosClient`, `PainelBuscaUnificado`).
- Dados iniciais buscados no Server Component com `db-client.ts` (anon). Client Components usam TanStack Query (`query-provider.tsx`) com `queryKey` estável e `staleTime` explícito; nunca `useEffect` + `fetch` manual para listas.
- `params`/`searchParams` são `Promise` no Next 16 → `await`. Estado de busca/filtro vive na URL (`searchParams`) para ser compartilhável.
- **Nunca importar** `db-admin.ts` em componente/página pública.
- Componentes visuais reutilizáveis em `src/components/ui` (padrão shadcn/Radix + `cva` + `cn()` de `src/lib/utils.ts`). Antes de criar, procure um existente (46 já disponíveis). Domínio em `src/components/portal`.
- Tailwind v4: classes utilitárias + tokens em `globals.css`; sem CSS inline, sem `!important`, sem cores hardcoded fora dos tokens.
- Formulários: `react-hook-form` + `zodResolver` com schema de `src/lib/schemas.ts`.
- Listas longas: paginar/virtualizar; `key` estável (hash/id, nunca índice).
- Imagens: `next/image`; ícones: `lucide-react`; toasts: `sonner`.
- Cada rota com dados assíncronos tem `loading.tsx`/`Suspense` e `error.tsx` (existe só `global-error.tsx` → criar por segmento quando tocar).
- Acessibilidade é requisito legal (portal público, VLibras já integrado): HTML semântico, `h1` único, `aria-label` em ícones-botão, foco visível, contraste AA, navegação por teclado, `alt` em imagens.
- Tipos de props vêm de `z.infer`/tipos de `src/lib`; proibido `any` e prop-drilling profundo (>2 níveis → composição).
- HTML externo: nunca `dangerouslySetInnerHTML` sem sanitizar (hoje usado em `layout.tsx` e `EmendaBlocks.tsx` — revisar antes de ampliar).

## Checklist
- [ ] Client boundary mínima
- [ ] loading + empty + error states
- [ ] Teclado/leitor de tela ok
- [ ] Sem lógica de negócio no JSX (mover para `src/lib`)
- [ ] `npx tsc --noEmit` + `npm run lint`
