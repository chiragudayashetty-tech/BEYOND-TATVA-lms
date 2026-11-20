// Server error, tracing and log reporting to Sentry (only when NEXT_PUBLIC_SENTRY_DSN or SENTRY_DSN is set).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const env = process.env.VERCEL_ENV || "development";

export function register() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: env,
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    sendDefaultPii: false,
    tracesSampleRate: env === "production" ? 0.2 : 1,
    enableLogs: true,
    integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],
  });
}

export const onRequestError = (...args) => (dsn ? Sentry.captureRequestError(...args) : undefined);
