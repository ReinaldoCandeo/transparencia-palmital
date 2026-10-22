import { z } from "zod";

/**
 * Schema de variáveis de ambiente públicas / de acesso ao banco cliente.
 * Suporta tanto o padrão Next.js local (NEXT_PUBLIC_*) quanto o padrão da Vercel (SUPABASE_*).
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("URL do Supabase deve ser uma URL válida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Chave anônima do Supabase é obrigatória"),
  SUPABASE_URL: z.string().url("URL do Supabase deve ser uma URL válida"),
  SUPABASE_ANON_KEY: z.string().min(1, "Chave anônima do Supabase é obrigatória"),
  NEXT_PUBLIC_ESIC_URL: z.string().url("NEXT_PUBLIC_ESIC_URL deve ser uma URL válida").optional().or(z.literal("")),
});

/**
 * Schema de variáveis de ambiente restritas ao servidor (segredos e tokens de API).
 * NUNCA devem ter prefixo NEXT_PUBLIC_!
 */
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY é obrigatória"),
  ONEDOC_BASE_URL: z.string().url("ONEDOC_BASE_URL deve ser uma URL válida"),
  ONEDOC_AUTH_HASH: z.string().min(1, "ONEDOC_AUTH_HASH é obrigatório"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET é obrigatório"),
  WEBHOOK_SECRET: z.string().min(1, "WEBHOOK_SECRET é obrigatório"),
  SYNC_CUTOFF_DATE: z.string().optional().default("2026-07-01T00:00:00Z"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

const isTestEnv = process.env.NODE_ENV === "test";
const isSkipEnv = process.env.SKIP_ENV_VALIDATION === "true" || process.env.NEXT_PHASE === "phase-production-build";

/**
 * Validação segura das variáveis públicas com fallback dual:
 * - NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
 */
function validatePublicEnv(): PublicEnv {
  const resolvedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const resolvedAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  const resolvedEsicUrl = process.env.NEXT_PUBLIC_ESIC_URL || "";

  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: resolvedUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: resolvedAnonKey,
    SUPABASE_URL: resolvedUrl,
    SUPABASE_ANON_KEY: resolvedAnonKey,
    NEXT_PUBLIC_ESIC_URL: resolvedEsicUrl,
  });

  if (!result.success) {
    if (isTestEnv || isSkipEnv) {
      const fallbackUrl = resolvedUrl || "https://placeholder-project.supabase.co";
      const fallbackKey = resolvedAnonKey || "placeholder-anon-key";
      return {
        NEXT_PUBLIC_SUPABASE_URL: fallbackUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: fallbackKey,
        SUPABASE_URL: fallbackUrl,
        SUPABASE_ANON_KEY: fallbackKey,
        NEXT_PUBLIC_ESIC_URL: resolvedEsicUrl,
      };
    }
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`[ENV] Configuração de variáveis públicas do Supabase inválida: ${issues}`);
  }

  return result.data;
}

let cachedServerEnv: ServerEnv | null = null;

/**
 * Validação LAZY de variáveis de ambiente de servidor.
 * Só é executada sob demanda quando uma rota ou função de servidor realmente necessita dos segredos,
 * prevenindo quebras durante o top-level import em `next build` e no CI.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  if (isSkipEnv && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-role-key",
      ONEDOC_BASE_URL: "https://integracoes.placeholder.link",
      ONEDOC_AUTH_HASH: "placeholder-auth-hash",
      CRON_SECRET: "placeholder-cron-secret",
      WEBHOOK_SECRET: "placeholder-webhook-secret",
      SYNC_CUTOFF_DATE: "2026-07-01T00:00:00Z",
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
    };
  }

  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ONEDOC_BASE_URL: process.env.ONEDOC_BASE_URL,
    ONEDOC_AUTH_HASH: process.env.ONEDOC_AUTH_HASH,
    CRON_SECRET: process.env.CRON_SECRET,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    SYNC_CUTOFF_DATE: process.env.SYNC_CUTOFF_DATE,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    if (isTestEnv) {
      return {
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key",
        ONEDOC_BASE_URL: process.env.ONEDOC_BASE_URL || "https://integracoes.test.link",
        ONEDOC_AUTH_HASH: process.env.ONEDOC_AUTH_HASH || "test-auth-hash",
        CRON_SECRET: process.env.CRON_SECRET || "test-cron-secret",
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "test-webhook-secret",
        SYNC_CUTOFF_DATE: process.env.SYNC_CUTOFF_DATE || "2026-07-01T00:00:00Z",
        NODE_ENV: "test",
      };
    }

    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`[ENV] Erro de configuração no servidor. Faltam ou são inválidas as variáveis: ${missing}`);
  }

  cachedServerEnv = result.data;
  return cachedServerEnv;
}

/**
 * Objeto centralizado para variáveis de ambiente.
 * - `env.public`: Acessível de imediato com fallback dual (NEXT_PUBLIC_* e SUPABASE_*).
 * - `env.server`: Getter lazy para consumo exclusivo em Server Components, Server Actions e API Routes.
 */
export const env = {
  get public(): PublicEnv {
    return validatePublicEnv();
  },
  get server(): ServerEnv {
    return getServerEnv();
  },
};
