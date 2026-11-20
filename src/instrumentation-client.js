// Browser monitoring. Each tool turns on only when its key is set in Vercel, so this file is safe without them.
// Students are minors: no names, emails or phones are sent. PostHog knows a student only by their random account id,
// session recordings are off, and Sentry drops IP addresses and cookies (sendDefaultPii: false).
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

try {
  if (SENTRY_DSN) {
    Sentry.init({ dsn: SENTRY_DSN, sendDefaultPii: false, tracesSampleRate: 0.1, environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development" });
  }
} catch (e) {
  console.warn("sentry init failed", e);
}

try {
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      defaults: "2025-05-24", // page views on every App Router navigation
      person_profiles: "identified_only",
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      autocapture: { dom_event_allowlist: ["click", "submit"] }, // never typed text
      respect_dnt: true,
    });
    // Link events to the account id only (a random uuid), and forget it on sign-out.
    createClient().auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id;
      if (id) {
        posthog.identify(id);
        Sentry.setUser({ id });
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
        Sentry.setUser(null);
      }
    });
  }
} catch (e) {
  console.warn("posthog init failed", e);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
