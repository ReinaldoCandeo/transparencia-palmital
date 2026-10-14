import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export interface AssertSecretAuthOptions {
  /**
   * Permite extrair o segredo de um query parameter específico (ex: "token").
   * Manter apenas quando estritamente necessário para compatibilidade retroativa.
   */
  allowQueryParam?: string;
  /**
   * Header customizado alternativo para enviar o segredo (ex: "x-webhook-secret").
   */
  headerName?: string;
}

/**
 * Compara duas strings em tempo constante usando SHA-256 e crypto.timingSafeEqual.
 * Previne ataques de canal lateral (timing attacks) e garante que Buffers de tamanhos
 * divergentes não lancem exceção nem vazem informação de comprimento.
 */
export function safeCompareStrings(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) {
    return false;
  }

  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Validação rigorosa e fail-closed de segredos para rotas internas, crons e webhooks.
 *
 * @param request Objeto da requisição (Request ou NextRequest)
 * @param envVarName Nome da variável de ambiente que contém o segredo esperado
 * @param options Opções adicionais (fallback para query string ou header alternativo)
 * @returns null se autorizado com sucesso, ou NextResponse (401/500) se rejeitado.
 */
export function assertSecretAuth(
  request: Request | NextRequest,
  envVarName: string,
  options?: AssertSecretAuthOptions
): NextResponse | null {
  const expectedSecret = process.env[envVarName]?.trim();

  // Fail-closed: se a variável de ambiente não estiver definida ou vazia, rejeita imediatamente com 500
  if (!expectedSecret) {
    console.error(`[API-AUTH] Falha crítica de segurança: variável de ambiente ${envVarName} não configurada ou vazia.`);
    return NextResponse.json(
      { error: "Erro de configuração no servidor." },
      { status: 500 }
    );
  }

  let candidateSecret: string | null = null;

  // 1. Extração do cabeçalho Authorization (padrão preferencial Bearer)
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      candidateSecret = bearerMatch[1].trim();
    } else {
      candidateSecret = authHeader.trim();
    }
  }

  // 2. Extração de header customizado configurado
  if (!candidateSecret && options?.headerName) {
    const customHeaderVal = request.headers.get(options.headerName);
    if (customHeaderVal) {
      candidateSecret = customHeaderVal.trim();
    }
  }

  // 3. Fallback controlado para query parameter (retrocompatibilidade restrita)
  if (!candidateSecret && options?.allowQueryParam) {
    try {
      if ("nextUrl" in request && request.nextUrl?.searchParams) {
        const queryVal = request.nextUrl.searchParams.get(options.allowQueryParam);
        if (queryVal) {
          candidateSecret = queryVal.trim();
        }
      } else {
        const urlObj = new URL(request.url);
        const queryVal = urlObj.searchParams.get(options.allowQueryParam);
        if (queryVal) {
          candidateSecret = queryVal.trim();
        }
      }
    } catch {
      candidateSecret = null;
    }
  }

  // 4. Validação em tempo constante
  if (!candidateSecret || !safeCompareStrings(candidateSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "secret",
  "key",
  "auth",
  "apikey",
  "api_key",
  "password",
  "cron_secret",
  "webhook_secret",
]);

/**
 * Higieniza strings de URL para evitar o vazamento de segredos em logs e Sentry.
 * Suporta tanto URLs absolutas quanto relativas (ex: "/api/webhooks/1doc?token=123").
 */
export function sanitizeUrlForLogging(inputUrl: string | URL): string {
  try {
    const raw = typeof inputUrl === "string" ? inputUrl : inputUrl.toString();
    const isRelative = !raw.startsWith("http://") && !raw.startsWith("https://");
    const url = new URL(raw, "http://localhost");

    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }

    if (isRelative) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return "[url-invalida]";
  }
}

/**
 * Higieniza uma query string pura (ex: "token=123&foo=bar" -> "token=[REDACTED]&foo=bar").
 */
export function sanitizeQueryString(queryString: string): string {
  if (!queryString) return "";
  try {
    const params = new URLSearchParams(queryString.startsWith("?") ? queryString.slice(1) : queryString);
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        params.set(key, "[REDACTED]");
      }
    }
    return params.toString();
  } catch {
    return "[query-invalida]";
  }
}
