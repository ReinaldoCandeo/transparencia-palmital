import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { publicEnvSchema, serverEnvSchema, getServerEnv, env } from "../env";

describe("env.ts", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("publicEnvSchema", () => {
    it("deve validar conjunto completo de variáveis públicas", () => {
      const valid = {
        NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
        SUPABASE_URL: "https://xyz.supabase.co",
        SUPABASE_ANON_KEY: "anon-key-123",
        NEXT_PUBLIC_ESIC_URL: "https://palmital.sp.gov.br/e-sic",
      };

      const result = publicEnvSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("deve rejeitar URL inválida no Supabase", () => {
      const invalid = {
        NEXT_PUBLIC_SUPABASE_URL: "url-invalida",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
        SUPABASE_URL: "url-invalida",
        SUPABASE_ANON_KEY: "anon-key-123",
      };

      const result = publicEnvSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("deve aceitar NEXT_PUBLIC_ESIC_URL vazio ou ausente", () => {
      const semEsic = {
        NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
        SUPABASE_URL: "https://xyz.supabase.co",
        SUPABASE_ANON_KEY: "anon-key-123",
        NEXT_PUBLIC_ESIC_URL: "",
      };

      expect(publicEnvSchema.safeParse(semEsic).success).toBe(true);
    });
  });

  describe("Suporte Dual de Variáveis do Supabase (Local vs Vercel)", () => {
    it("deve validar com sucesso quando apenas NEXT_PUBLIC_SUPABASE_* estão configuradas (padrão .env.local)", () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://local-projeto.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-anon-key-123";

      const publicEnv = env.public;
      expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("https://local-projeto.supabase.co");
      expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("local-anon-key-123");
      expect(publicEnv.SUPABASE_URL).toBe("https://local-projeto.supabase.co");
      expect(publicEnv.SUPABASE_ANON_KEY).toBe("local-anon-key-123");
    });

    it("deve validar com sucesso quando apenas SUPABASE_* estão configuradas (padrão integração Vercel)", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.SUPABASE_URL = "https://vercel-projeto.supabase.co";
      process.env.SUPABASE_ANON_KEY = "vercel-anon-key-456";

      const publicEnv = env.public;
      expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("https://vercel-projeto.supabase.co");
      expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("vercel-anon-key-456");
      expect(publicEnv.SUPABASE_URL).toBe("https://vercel-projeto.supabase.co");
      expect(publicEnv.SUPABASE_ANON_KEY).toBe("vercel-anon-key-456");
    });

    it("deve dar preferência para NEXT_PUBLIC_* se ambos os pares estiverem configurados", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public-override.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-key-789";
      process.env.SUPABASE_URL = "https://server-base.supabase.co";
      process.env.SUPABASE_ANON_KEY = "server-key-000";

      const publicEnv = env.public;
      expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("https://public-override.supabase.co");
      expect(publicEnv.SUPABASE_URL).toBe("https://public-override.supabase.co");
      expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("public-key-789");
    });
  });

  describe("serverEnvSchema", () => {
    it("deve validar conjunto completo de variáveis de servidor", () => {
      const valid = {
        SUPABASE_SERVICE_ROLE_KEY: "service-key-123",
        ONEDOC_BASE_URL: "https://integracoes.1doc.link",
        ONEDOC_AUTH_HASH: "auth-hash-456",
        CRON_SECRET: "cron-secret-789",
        WEBHOOK_SECRET: "webhook-secret-000",
        SYNC_CUTOFF_DATE: "2026-07-01T00:00:00Z",
        NODE_ENV: "production",
      };

      const result = serverEnvSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("deve rejeitar se faltar qualquer chave mandatória de servidor", () => {
      const incomplete = {
        SUPABASE_SERVICE_ROLE_KEY: "service-key-123",
        ONEDOC_BASE_URL: "https://integracoes.1doc.link",
      };

      const result = serverEnvSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });

  describe("getServerEnv e env object", () => {
    it("deve retornar variáveis em ambiente de teste com fallbacks seguros sem lançar erro", () => {
      const server = getServerEnv();
      expect(server).toBeDefined();
      expect(server.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
      expect(server.ONEDOC_BASE_URL).toBeDefined();
    });

    it("deve expor getters públicos e de servidor sem quebrar o client", () => {
      expect(env.public).toBeDefined();
      expect(env.public.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(env.server).toBeDefined();
    });
  });
});
