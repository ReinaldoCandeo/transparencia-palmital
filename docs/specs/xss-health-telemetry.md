# Spec — Segurança de Renderização (XSS), Blindagem de Healthcheck e Otimização do Sentry (`xss-health-telemetry`)

## 1. Contexto e Problema

Auditorias de segurança e qualidade técnica identificaram três áreas críticas que demandam refatoração e endurecimento:

1. **Segurança de Renderização (XSS) com `dangerouslySetInnerHTML`**:
   - `src/components/portal/EmendaBlocks.tsx` (linhas 259 e 481): Renderiza o campo `conteudo` vindo diretamente da API da 1Doc utilizando `dangerouslySetInnerHTML` sem qualquer sanitização HTML prévia contra vetores de ataque XSS (ex: `<script>`, `<img onerror>`, `javascript:`, `<iframe`).
   - `src/app/layout.tsx` (linha 34): Utiliza `dangerouslySetInnerHTML` para injetar o script estático de inicialização do VLibras (`vlibras-init`), o que gera alertas de segurança desnecessários e desvia das boas práticas do Next.js.
   - *Restrições técnicas*: A aplicação roda em Next.js 16 (React 19) na Vercel Serverless. Bibliotecas pesadas dependentes de emulação de DOM em Node via `jsdom` (como `isomorphic-dompurify`) introduzem dependências nativas (como `canvas`), elevam o tamanho do bundle e quebram deploys em ambientes Serverless/Edge.

2. **Exposição Excessiva de Infraestrutura em `GET /api/health`**:
   - `src/app/api/health/route.ts`: Expõe publicamente dados internos do host e do sistema operacional (`os.freemem()`, `os.totalmem()`, `os.loadavg()`, `process.uptime()`), permitindo profiling e fingerprinting da infraestrutura por atacantes.
   - Vazamento de mensagens cruas de erro do banco (`error.message`), expondo nomes de tabelas, detalhes de driver ou conexão.
   - Uso indevido de `supabaseAdmin` (chave Service Role) em rota pública desautenticada, violando a Regra 1 da Constituição do Projeto.
   - Violação de tipagem com uso de `catch (error: any)`.
   - Se os dados estiverem desatualizados (> 24h sem sync), o healthcheck lança erro e responde `503` com `database: 'down'`, quando na verdade o banco está saudável e apenas a sincronização está atrasada (deveria reportar status `degraded`).

3. **Tempestade de Telemetria e Vazamento de Segredos no Sentry**:
   - `tracesSampleRate: 1` (100% de amostragem de traces de navegação e requisições) em `sentry.client.config.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts`. Isso consome cotas do Sentry prematuramente através de transações de prefetch e rotas estáticas.
   - `sentry.client.config.ts` e `src/instrumentation-client.ts` não possuem filtros no `beforeSend` e `beforeSendTransaction` para higienizar parâmetros sensíveis na URL (`token`, `secret`, `key`, `auth`, etc.), criando risco de envio de segredos de requisições de clientes para o dashboard do Sentry.

---

## 2. Regras de Negócio e Solução Proposta

### 2.1 Eliminação e Sanitização de XSS

1. **`src/app/layout.tsx`**:
   - Substituir `dangerouslySetInnerHTML` pela sintaxe nativa e segura recomendada do Next.js `<Script id="vlibras-init" strategy="afterInteractive">{`...`}</Script>`. Como o script é estático e hardcoded, a injeção como nó filho direto do componente `Script` elimina `dangerouslySetInnerHTML` e impede avisos de linter.

2. **Componente Seguro `<SafeHtml />` (`src/components/portal/SafeHtml.tsx`)**:
   - Criar um renderizador de HTML seguro e ultraleve, com **zero dependências externas** (sem `jsdom`, sem pacotes nativos, sem impacto de cold start na Vercel).
   - O componente realiza a análise léxica (tokenização) das tags HTML seguras vindas do editor da 1Doc e as converte diretamente em nós nativos do React via `React.createElement`.
   - **Lista branca estrita de tags permitidas**:
     - Formatação de texto: `p`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `blockquote`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `span`, `div`, `hr`.
     - Listas: `ul`, `ol`, `li`.
     - Tabelas: `table`, `thead`, `tbody`, `tr`, `th`, `td`.
     - Links: `a` (com validação estrita).
   - **Regras de segurança para links (`<a>`)**:
     - Protocolos permitidos: apenas `http:`, `https:` ou `mailto:`.
     - Protocolos perigosos (`javascript:`, `data:`, `vbscript:`) são descartados imediatamente (o atributo `href` é omitido ou o link é renderizado como texto puro).
     - Atributos de segurança injetados automaticamente: `target="_blank"` e `rel="noopener noreferrer"`.
   - **Tags terminantemente proibidas (descartadas do output)**:
     - `script`, `iframe`, `object`, `embed`, `style`, `svg`, `img`, `form`, `input`, `button`, `link`, `meta`.
   - **Atributos proibidos**:
     - Todo e qualquer manipulador de eventos (`onclick`, `onerror`, `onload`, `onmouseover`, etc.) é limpo e ignorado.
   - **Benefício**: Ao utilizar nós React em vez de `dangerouslySetInnerHTML`, os textos são protegidos pelo mecanismo intrínseco de escape do React. O risco de execução arbitrária de scripts no navegador do cidadão é zerado.

3. **`src/components/portal/EmendaBlocks.tsx`**:
   - Substituir as ocorrências de `dangerouslySetInnerHTML` (linhas 259 e 481) pelo componente `<SafeHtml html={conteudo} className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground" />`.

---

### 2.2 Blindagem e Enxugamento de `GET /api/health`

1. **Remoção de vazamento de infraestrutura**:
   - Remover import e chamadas ao módulo `os` de Node.js (`freemem`, `totalmem`, `loadavg`).
   - Remover exposição de `process.uptime()`.
   - Remover chamadas ao `supabaseAdmin` em rota pública desautenticada.
2. **Uso do cliente Supabase público**:
   - Utilizar exclusivamente a instância `supabase` pública anônima para testar a conectividade e consultar a data da última sincronização (`ultima_sincronizacao`) na tabela `processos_emendas`.
3. **Novo Contrato da Resposta (`HealthResponse`)**:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-10-15T13:00:00.000Z",
     "latencyMs": 42,
     "sync": {
       "lastSyncAt": "2026-10-15T12:00:00.000Z",
       "status": "synced"
     }
   }
   ```
4. **Lógica de Status e Códigos HTTP**:
   - **Status `ok` (HTTP 200)**: Conexão com banco bem-sucedida e última sincronização recente (ocorrida há ≤ 24 horas). `sync.status: "synced"`.
   - **Status `degraded` (HTTP 200)**: Conexão com banco bem-sucedida, porém sem registro de sincronização ou com última sincronização há > 24 horas. `sync.status: "stale"`. A aplicação permanece online e acessível para o usuário, mas sinaliza ao monitor que o sincronizador necessita de atenção.
   - **Status `error` (HTTP 503)**: Falha de comunicação/rede com o banco de dados.
     - O erro original é reportado internamente ao Sentry (`Sentry.captureException(err)`).
     - O payload público retornado é estritamente limpo:
       ```json
       {
         "status": "error",
         "timestamp": "2026-10-15T13:00:00.000Z",
         "latencyMs": 150,
         "sync": {
           "lastSyncAt": null,
           "status": "unknown"
         }
       }
       ```
     - Nenhuma mensagem interna (`error.message`, Postgres error codes ou connection strings) é exposta.

---

### 2.3 Otimização e Higienização do Sentry

1. **Ajuste de Amostragem (`tracesSampleRate`)**:
   - Nos 4 arquivos de telemetria:
     - `sentry.client.config.ts`
     - `src/instrumentation-client.ts`
     - `sentry.server.config.ts`
     - `sentry.edge.config.ts`
   - Alterar de `tracesSampleRate: 1` para:
     ```ts
     tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
     ```
   - **Garantia**: A captura de erros e exceções não tratadas permanece em 100% (inalterada). Apenas o volume de transações de performance e navegações em produção é reduzido para 10%, prevenindo esgotamento da cota de envelopes.

2. **Higienização de Credenciais no Client-Side**:
   - Aplicar `beforeSend` e `beforeSendTransaction` em `sentry.client.config.ts` e `src/instrumentation-client.ts`.
   - Redigir parâmetros sensíveis (`token`, `secret`, `key`, `auth`, `apikey`, `api_key`, `password`, `cron_secret`, `webhook_secret`) em:
     - URLs do evento (`event.request.url`);
     - Query strings (`event.request.query_string`);
     - Breadcrumbs de navegação, XHR e Fetch (`event.breadcrumbs`).

3. **Integração no Lint**:
   - Incluir `sentry.client.config.ts` no script `"lint"` do `package.json` para assegurar que configurações futuras também passem na validação estática.

---

## 3. Modelo de Dados e Schemas Zod

Adicionar em `src/lib/schemas.ts`:

```ts
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  timestamp: z.string(),
  latencyMs: z.number(),
  sync: z.object({
    lastSyncAt: z.string().nullable(),
    status: z.enum(["synced", "stale", "unknown"]),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
```

---

## 4. Casos de Borda e Resiliência

| Caso de Borda | Cenário | Comportamento Esperado |
| :--- | :--- | :--- |
| **HTML da 1Doc com tag maliciosa** | `conteudo` contém `<script>alert('xss')</script>` | Tag `<script>` é descartada; nenhum script é executado. |
| **Link com JavaScript** | `conteudo` contém `<a href="javascript:stealCookie()">link</a>` | Protocolo inválido detectado; o atributo `href` é anulado. |
| **Atributo de evento malicioso** | `conteudo` contém `<p onerror="attack()">texto</p>` | Atributo `onerror` é expurgado; apenas o parágrafo é renderizado. |
| **HTML malformado / tags órfãs** | 1Doc envia `<p>parágrafo sem fechamento` ou `<strong><i>incompleto` | O parser tokeniza sem lançar exceção e renderiza com segurança. |
| **Conteúdo vazio / nulo** | Processo não possui justificativa (`conteudo` é `null` ou `undefined`) | `<SafeHtml />` retorna `null`, sem renderizar wrappers vazios. |
| **Banco fora do ar no Healthcheck** | Supabase inacessível ou falha de timeout | Retorna HTTP 503 com `{ status: "error" }`, loga no Sentry, sem expor mensagens de banco. |
| **Base limpa / zero processos** | Tabela `processos_emendas` vazia | Retorna HTTP 200 com status `"degraded"` e `sync.status: "unknown"`, sem estourar `single()`. |
| **Sincronização atrasada (>24h)** | Fim de semana sem movimentação da 1Doc | Retorna HTTP 200 com status `"degraded"` e `sync.status: "stale"`. |
| **URL com token no navegador do cliente** | Usuário/admin acessa página com query sensível e ocorre erro | Sentry redige o valor para `[REDACTED]` antes de despachar o evento. |

---

## 5. Tarefas de Implementação (Passo a Passo)

1. **Tarefa 1 (`src/lib/schemas.ts`)**:
   - Declarar `healthResponseSchema` e o tipo `HealthResponse`.

2. **Tarefa 2 (`src/components/portal/SafeHtml.tsx`)**:
   - Criar o componente `<SafeHtml />` com parser e sanitizador leve (zero dependências externas), suporte a tags básicas de formatação, tabelas, listas e links higienizados.

3. **Tarefa 3 (`src/components/portal/EmendaBlocks.tsx`)**:
   - Substituir `dangerouslySetInnerHTML` por `<SafeHtml html={conteudo} />` nas seções de justificativa e objeto.

4. **Tarefa 4 (`src/app/layout.tsx`)**:
   - Substituir `dangerouslySetInnerHTML` no script do VLibras pelo padrão de nó filho do `<Script>`.

5. **Tarefa 5 (`src/app/api/health/route.ts`)**:
   - Refatorar a rota `GET /api/health`: remover `os`, `process.uptime()`, `supabaseAdmin`, e vazamento de `error.message`. Implementar triagem de status (`ok` / `degraded` / `error`) e validação via `healthResponseSchema`.

6. **Tarefa 6 (`sentry.server.config.ts` e `sentry.edge.config.ts`)**:
   - Ajustar `tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0`.

7. **Tarefa 7 (`sentry.client.config.ts` e `src/instrumentation-client.ts`)**:
   - Ajustar `tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0`.
   - Adicionar funções de higienização de URLs, query strings e breadcrumbs no `beforeSend` e `beforeSendTransaction`.

8. **Tarefa 8 (`package.json`)**:
   - Adicionar `sentry.client.config.ts` no comando `lint`.

9. **Tarefa 9 (Auditoria e Validação)**:
   - Executar `npm run lint` e `npx tsc --noEmit`.
   - Garantir que não existam erros ou regressões.

---

## 6. Fora de Escopo

- Alteração na lógica dos charts em `src/components/ui/chart.tsx` (o uso de `<style>` com variáveis CSS temáticas é estático/controlado pelo design system).
- Mudança na regra de negócio de agrupamento por CNPJ ou classificação de emendas.
- Instalação de pacotes pesados como `jsdom`, `isomorphic-dompurify` ou bibliotecas C++ nativas.
