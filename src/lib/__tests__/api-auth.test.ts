import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  safeCompareStrings,
  assertSecretAuth,
  sanitizeUrlForLogging,
  sanitizeQueryString,
} from "../api-auth";

describe("api-auth.ts", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("safeCompareStrings", () => {
    it("deve retornar true para strings idênticas", () => {
      expect(safeCompareStrings("token-secreto-123", "token-secreto-123")).toBe(true);
    });

    it("deve retornar false para strings de mesmo tamanho com conteúdo diferente", () => {
      expect(safeCompareStrings("token-secreto-123", "token-secreto-999")).toBe(false);
    });

    it("deve retornar false sem lançar erro de buffer para strings de tamanhos divergentes", () => {
      expect(safeCompareStrings("curto", "um-token-extremamente-longo-e-complexo")).toBe(false);
      expect(safeCompareStrings("um-token-extremamente-longo-e-complexo", "curto")).toBe(false);
    });

    it("deve retornar false para entradas nulas, indefinidas ou vazias", () => {
      expect(safeCompareStrings("", "token")).toBe(false);
      expect(safeCompareStrings("token", "")).toBe(false);
      expect(safeCompareStrings(null, "token")).toBe(false);
      expect(safeCompareStrings("token", null)).toBe(false);
      expect(safeCompareStrings(undefined, "token")).toBe(false);
      expect(safeCompareStrings(undefined, undefined)).toBe(false);
    });
  });

  describe("assertSecretAuth", () => {
    it("deve autorizar requisição com Authorization Bearer correto", () => {
      process.env.TEST_SECRET = "super-segredo-123";
      const req = new Request("http://localhost/api/test", {
        headers: {
          authorization: "Bearer super-segredo-123",
        },
      });

      const res = assertSecretAuth(req, "TEST_SECRET");
      expect(res).toBeNull();
    });

    it("deve autorizar requisição com Authorization direto (sem prefixo Bearer)", () => {
      process.env.TEST_SECRET = "super-segredo-123";
      const req = new Request("http://localhost/api/test", {
        headers: {
          authorization: "super-segredo-123",
        },
      });

      const res = assertSecretAuth(req, "TEST_SECRET");
      expect(res).toBeNull();
    });

    it("deve rejeitar requisição com token inválido com HTTP 401", async () => {
      process.env.TEST_SECRET = "super-segredo-123";
      const req = new Request("http://localhost/api/test", {
        headers: {
          authorization: "Bearer token-errado",
        },
      });

      const res = assertSecretAuth(req, "TEST_SECRET");
      expect(res).not.toBeNull();
      expect(res?.status).toBe(401);
      const json = await res?.json();
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("deve suportar header customizado configurado", () => {
      process.env.WEBHOOK_SECRET = "webhook-key-999";
      const req = new Request("http://localhost/api/webhook", {
        headers: {
          "x-custom-secret": "webhook-key-999",
        },
      });

      const res = assertSecretAuth(req, "WEBHOOK_SECRET", {
        headerName: "x-custom-secret",
      });
      expect(res).toBeNull();
    });

    it("deve suportar fallback de query parameter quando explicitamente permitido", () => {
      process.env.CRON_SECRET = "cron-token-456";
      const req = new Request("http://localhost/api/cron?token=cron-token-456");

      const res = assertSecretAuth(req, "CRON_SECRET", {
        allowQueryParam: "token",
      });
      expect(res).toBeNull();
    });

    it("não deve aceitar query parameter se allowQueryParam não estiver configurado", () => {
      process.env.CRON_SECRET = "cron-token-456";
      const req = new Request("http://localhost/api/cron?token=cron-token-456");

      const res = assertSecretAuth(req, "CRON_SECRET");
      expect(res?.status).toBe(401);
    });

    it("deve atuar fail-closed com HTTP 500 se a variável de ambiente não estiver configurada", async () => {
      delete process.env.MISSING_SECRET;
      const req = new Request("http://localhost/api/test", {
        headers: {
          authorization: "Bearer qualquer-coisa",
        },
      });

      const res = assertSecretAuth(req, "MISSING_SECRET");
      expect(res).not.toBeNull();
      expect(res?.status).toBe(500);
      const json = await res?.json();
      expect(json).toEqual({ error: "Erro de configuração no servidor." });
    });
  });

  describe("sanitizeUrlForLogging e sanitizeQueryString", () => {
    it("deve redigir parâmetros sensíveis em URLs absolutas", () => {
      const url = "https://transparencia.palmital.sp.gov.br/api/cron?token=123456&pagina=1";
      const safe = sanitizeUrlForLogging(url);
      expect(safe).toContain("token=%5BREDACTED%5D");
      expect(safe).toContain("pagina=1");
      expect(safe).not.toContain("123456");
    });

    it("deve redigir parâmetros sensíveis em URLs relativas", () => {
      const url = "/api/webhooks/1doc?webhook_secret=minha-chave-secreta&assunto=saude";
      const safe = sanitizeUrlForLogging(url);
      expect(safe).toContain("webhook_secret=%5BREDACTED%5D");
      expect(safe).toContain("assunto=saude");
      expect(safe).not.toContain("minha-chave-secreta");
    });

    it("deve higienizar query strings puras", () => {
      const query = "auth=abc&api_key=xyz&filtro=obras";
      const safe = sanitizeQueryString(query);
      expect(safe).toContain("auth=%5BREDACTED%5D");
      expect(safe).toContain("api_key=%5BREDACTED%5D");
      expect(safe).toContain("filtro=obras");
      expect(safe).not.toContain("abc");
      expect(safe).not.toContain("xyz");
    });
  });
});
