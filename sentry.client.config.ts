// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "@/lib/sentry-sanitize";

Sentry.init({
  dsn: "https://0bd79e584111883d3e52e9e687497458@o4512022586982400.ingest.us.sentry.io/4512022714122240",

  // Amostragem de performance reduzida em produção para poupar cota de telemetria
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  beforeSend(event) {
    return sanitizeSentryEvent(event);
  },

  beforeSendTransaction(event) {
    return sanitizeSentryEvent(event);
  },

  // Setting this option to true will print useful information in the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
