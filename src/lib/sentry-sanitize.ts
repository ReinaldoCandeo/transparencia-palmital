/**
 * Utilitário universal de sanitização de eventos e telemetria do Sentry.
 * Funciona sem dependências nativas nos runtimes Browser, Edge e Node.js.
 */

export const SENSITIVE_PARAM_NAMES = new Set([
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

export function sanitizeSensitiveUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const isRelative = !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://");
    const url = new URL(rawUrl, "http://localhost");

    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_PARAM_NAMES.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }

    if (isRelative) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return rawUrl.replace(/(token|secret|key|auth|apikey|password)=([^&]+)/gi, "$1=[REDACTED]");
  }
}

export function sanitizeSensitiveQuery(rawQuery: string): string {
  try {
    const params = new URLSearchParams(rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery);
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_PARAM_NAMES.has(key.toLowerCase())) {
        params.set(key, "[REDACTED]");
      }
    }
    return params.toString();
  } catch {
    return rawQuery.replace(/(token|secret|key|auth|apikey|password)=([^&]+)/gi, "$1=[REDACTED]");
  }
}

export function sanitizeQueryParamData(query: unknown): unknown {
  if (!query) return query;
  if (typeof query === "string") {
    return sanitizeSensitiveQuery(query);
  }
  if (Array.isArray(query)) {
    return query.map(([key, val]) => [
      key,
      SENSITIVE_PARAM_NAMES.has(String(key).toLowerCase()) ? "[REDACTED]" : val,
    ]);
  }
  if (typeof query === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(query as Record<string, unknown>)) {
      sanitizedObj[key] = SENSITIVE_PARAM_NAMES.has(key.toLowerCase()) ? "[REDACTED]" : val;
    }
    return sanitizedObj;
  }
  return query;
}

/**
 * Sanitiza parâmetros sensíveis em eventos do Sentry (ErrorEvent e TransactionEvent).
 * Retorna o próprio evento com o tipo genérico preservado para compatibilidade total com beforeSend.
 */
export function sanitizeSentryEvent<T>(event: T): T {
  if (!event || typeof event !== "object") return event;

  const ev = event as Record<string, unknown>;

  if (ev.request && typeof ev.request === "object") {
    const req = ev.request as Record<string, unknown>;
    if (typeof req.url === "string") {
      req.url = sanitizeSensitiveUrl(req.url);
    }
    if (req.query_string !== undefined) {
      req.query_string = sanitizeQueryParamData(req.query_string);
    }
  }

  if (Array.isArray(ev.breadcrumbs)) {
    ev.breadcrumbs = ev.breadcrumbs.map((b) => {
      if (b && typeof b === "object") {
        const br = b as Record<string, unknown>;
        if (br.data && typeof br.data === "object") {
          const data = br.data as Record<string, unknown>;
          if (typeof data.url === "string") {
            data.url = sanitizeSensitiveUrl(data.url);
          }
          if (typeof data.to === "string") {
            data.to = sanitizeSensitiveUrl(data.to);
          }
          if (typeof data.from === "string") {
            data.from = sanitizeSensitiveUrl(data.from);
          }
        }
        if (typeof br.message === "string") {
          br.message = sanitizeSensitiveUrl(br.message) ?? br.message;
        }
      }
      return b;
    });
  }

  return event;
}
