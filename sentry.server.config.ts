// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "./src/lib/sentry-sanitize";

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

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
