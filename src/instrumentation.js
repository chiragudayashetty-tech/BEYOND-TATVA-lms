// Server error reporting to Sentry (only when SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is set in Vercel).
import * as Sentry from "@sentry/nextjs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// This provider is deliberately separate from the global OTel provider: only the lines emitted
// through posthogLog below leave the application for PostHog Logs.
export const posthogLoggerProvider = posthogKey && posthogHost
  ? new LoggerProvider({
      resource: resourceFromAttributes({ "service.name": "beyond-tattva-lms" }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${posthogHost}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${posthogKey}`,
              "Content-Type": "application/json",
            },
          }),
        }),
      ],
    })
  : null;

const posthogLogger = posthogLoggerProvider?.getLogger("posthog-log-exporter");

export function posthogLog(body, attributes) {
  posthogLogger?.emit({ severityText: "INFO", body, attributes });
}

export function flushPosthogLogs() {
  return posthogLoggerProvider?.forceFlush().catch(() => {});
}

export function register() {
  if (!posthogLoggerProvider && process.env.NODE_ENV !== "production") {
    const missingVariable = posthogKey ? "NEXT_PUBLIC_POSTHOG_HOST" : "NEXT_PUBLIC_POSTHOG_KEY";
    console.warn(`${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`);
  }
  if (!dsn) return;
  Sentry.init({ dsn, sendDefaultPii: false, tracesSampleRate: 0.1, environment: process.env.VERCEL_ENV || "development" });
}

export const onRequestError = (...args) => (dsn ? Sentry.captureRequestError(...args) : undefined);
