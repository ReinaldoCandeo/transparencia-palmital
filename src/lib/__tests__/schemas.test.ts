import { describe, it, expect } from "vitest";
import {
  webhook1DocPayloadSchema,
  healthResponseSchema,
  processoEmendaSchema,
} from "../schemas";

describe("schemas.ts", () => {
  describe("webhook1DocPayloadSchema", () => {
    it("deve validar payload com emissão e hash válidos", () => {
      const payload = {
        emissao: {
          hash: "61295E9314B2BFA03893D780",
        },
      };

      const result = webhook1DocPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("deve permitir campos extras dinâmicos da 1Doc via .passthrough()", () => {
      const payload = {
        evento: "tramitacao",
        emissao: {
          hash: "61295E9314B2BFA03893D780",
          novo_campo_1doc: "valor qualquer",
        },
        metadados_adicionais: {
          origem: "sistema-externo",
        },
      };

      const result = webhook1DocPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        const emissao = result.data.emissao as Record<string, unknown> | undefined;
        expect(data.evento).toBe("tramitacao");
        expect(emissao?.novo_campo_1doc).toBe("valor qualquer");
      }
    });

    it("deve rejeitar payload com hash de emissão vazio", () => {
      const payload = {
        emissao: {
          hash: "",
        },
      };

      const result = webhook1DocPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("healthResponseSchema", () => {
    it("deve validar payload com status 'ok'", () => {
      const validOk = {
        status: "ok",
        timestamp: new Date().toISOString(),
        latencyMs: 35,
        sync: {
          lastSyncAt: new Date().toISOString(),
          status: "synced",
        },
      };

      expect(healthResponseSchema.safeParse(validOk).success).toBe(true);
    });

    it("deve validar payload com status 'degraded' e 'stale'", () => {
      const degraded = {
        status: "degraded",
        timestamp: new Date().toISOString(),
        latencyMs: 50,
        sync: {
          lastSyncAt: "2026-07-01T00:00:00.000Z",
          status: "stale",
        },
      };

      expect(healthResponseSchema.safeParse(degraded).success).toBe(true);
    });

    it("deve validar payload com status 'error' e 'unknown'", () => {
      const errorResp = {
        status: "error",
        timestamp: new Date().toISOString(),
        latencyMs: 120,
        sync: {
          lastSyncAt: null,
          status: "unknown",
        },
      };

      expect(healthResponseSchema.safeParse(errorResp).success).toBe(true);
    });

    it("deve rejeitar status inválido fora do enum", () => {
      const invalid = {
        status: "offline",
        timestamp: new Date().toISOString(),
        latencyMs: 100,
        sync: {
          lastSyncAt: null,
          status: "unknown",
        },
      };

      expect(healthResponseSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("processoEmendaSchema", () => {
    it("deve validar registro com campos mínimos obrigatórios e preencher defaults", () => {
      const rowMinima = {
        hash: "CF4594800B07A90726AD6C6D",
        num: "123",
        ano: "2024",
        id_assunto: 1915747,
      };

      const result = processoEmendaSchema.safeParse(rowMinima);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.form_data).toEqual([]);
        expect(result.data.movimentacoes).toEqual([]);
        expect(result.data.anexos).toEqual([]);
      }
    });

    it("deve rejeitar registro se faltar o campo hash", () => {
      const semHash = {
        num: "123",
        ano: "2024",
        id_assunto: 1915747,
      };

      expect(processoEmendaSchema.safeParse(semHash).success).toBe(false);
    });
  });
});
