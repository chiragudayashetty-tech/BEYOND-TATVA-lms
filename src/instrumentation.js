// Server error reporting to Sentry (only when SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is set in Vercel).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export function register() {
  if (!dsn) return;
  Sentry.init({ dsn, sendDefaultPii: false, tracesSampleRate: 0.1, environment: process.env.VERCEL_ENV || "development" });
}

export const onRequestError = (...args) => (dsn ? Sentry.captureRequestError(...args) : undefined);
