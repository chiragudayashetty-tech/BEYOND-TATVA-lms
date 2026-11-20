// Browser monitoring. Each tool turns on only when its key is set in Vercel, so this file is safe without them.
// Students are minors: no names, emails or phones are sent. PostHog knows a student only by their random account id,
// and Sentry drops IP addresses and cookies (sendDefaultPii: false).
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

try {
  if (SENTRY_DSN) {
    Sentry.init({ dsn: SENTRY_DSN, sendDefaultPii: false, tracesSampleRate: 0.1, environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development" });
  }
} catch (e) {
  console.warn("sentry init failed", e);
}

if (POSTHOG_KEY && POSTHOG_HOST) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: "2025-05-24", // page views on every App Router navigation
    person_profiles: "identified_only",
    mask_all_text: true,
    mask_all_element_attributes: true,
    autocapture: { dom_event_allowlist: ["click", "submit"] }, // never typed text
    respect_dnt: true,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
  // Link events to the account id only (a random UUID). Supabase emits INITIAL_SESSION on
  // refresh, so this also restores identity for error reporting after a full page load.
  let identifiedUserId = null;
  const forgetUser = () => {
    posthog.reset();
    Sentry.setUser(null);
    identifiedUserId = null;
  };

  createClient().auth.onAuthStateChange((event, session) => {
    const id = session?.user?.id;
    if (id) {
      // A device can switch accounts without first emitting SIGNED_OUT.
      if (identifiedUserId && identifiedUserId !== id) posthog.reset();
      if (identifiedUserId !== id) posthog.identify(id);
      identifiedUserId = id;
      Sentry.setUser({ id });
    } else if (event === "SIGNED_OUT") {
      forgetUser();
    }
  });

  // The app signs out through a server form, which clears the auth cookie without a browser
  // Supabase event. Reset before that navigation so the next visitor is anonymous.
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form instanceof HTMLFormElement && form.getAttribute("action") === "/auth/signout") forgetUser();
  });
} else if (process.env.NODE_ENV === "development") {
  const missingVariable = POSTHOG_KEY ? "NEXT_PUBLIC_POSTHOG_HOST" : "NEXT_PUBLIC_POSTHOG_KEY";
  console.error(`${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
