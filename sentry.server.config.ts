// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENSITIVE_PARAM_NAMES = new Set([
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

function sanitizeSensitiveUrl(rawUrl?: string): string | undefined {
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

function sanitizeSensitiveQuery(rawQuery: string): string {
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

function sanitizeQueryParamData(query: unknown): unknown {
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

type SentryInitOptions = Parameters<typeof Sentry.init>[0];
type SentryErrorEvent = Parameters<NonNullable<SentryInitOptions["beforeSend"]>>[0];
type SentryTransactionEvent = Parameters<NonNullable<SentryInitOptions["beforeSendTransaction"]>>[0];

function sanitizeEvent<T extends SentryErrorEvent | SentryTransactionEvent>(event: T): T {
  if (event && "request" in event && event.request) {
    if (event.request.url) {
      event.request.url = sanitizeSensitiveUrl(event.request.url);
    }
    if (event.request.query_string) {
      event.request.query_string = sanitizeQueryParamData(event.request.query_string) as typeof event.request.query_string;
    }
  }
  return event;
}

Sentry.init({
  dsn: "https://0bd79e584111883d3e52e9e687497458@o4512022586982400.ingest.us.sentry.io/4512022714122240",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  beforeSend(event) {
    return sanitizeEvent(event);
  },

  beforeSendTransaction(event) {
    return sanitizeEvent(event);
  },

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
