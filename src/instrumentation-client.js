// Browser monitoring. Each tool turns on only when its key is set in Vercel, so this file is safe without them.
// Students are minors: no names, emails or phones are sent. PostHog and Sentry know a student only by their random
// account id. Session recordings hide ALL text and typing and block images/video, so screens are wireframes only.
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";
import { scrubEvent, scrubUrl } from "@/lib/scrub-url";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENV = process.env.NEXT_PUBLIC_VERCEL_ENV || "development";

try {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENV,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,
      sendDefaultPii: false,
      // /pay and /login carry the phone number and payment id in the address: never send those.
      beforeSend(event) {
        if (event.request?.url) event.request.url = scrubUrl(event.request.url);
        if (event.request?.query_string) delete event.request.query_string;
        return event;
      },
      beforeBreadcrumb(crumb) {
        if (crumb?.data) for (const k of ["from", "to", "url"]) if (typeof crumb.data[k] === "string") crumb.data[k] = scrubUrl(crumb.data[k]);
        return crumb;
      },
      tracesSampleRate: ENV === "production" ? 0.2 : 1,
      enableLogs: true,
      // Replays only when an error happens (free plan: 50/month), fully masked.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1,
      integrations: [
        Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
        Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
      ],
    });
  }
} catch (e) {
  console.warn("sentry init failed", e);
}

try {
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      defaults: "2025-05-24", // page views and page leaves on every App Router navigation
      person_profiles: "identified_only",
      respect_dnt: true,
      autocapture: { dom_event_allowlist: ["click", "submit", "change"] },
      mask_all_text: true,
      mask_all_element_attributes: true,
      capture_exceptions: true, // PostHog error tracking (Sentry stays the main error tool)
      capture_performance: { web_vitals: true },
      enable_heatmaps: true,
      before_send: scrubEvent, // phone numbers / payment ids in /pay and /login addresses never leave the browser
      session_recording: { maskAllInputs: true, maskTextSelector: "*", blockSelector: "img, video, iframe, canvas" },
    });
    posthog.register({ app: "lms", environment: ENV });
    // Link events to the account id only (a random uuid), and forget it on sign-out.
    createClient().auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (user?.id) {
        posthog.identify(user.id);
        Sentry.setUser({ id: user.id });
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
        Sentry.setUser(null);
      }
    });
  } else if (SENTRY_DSN) {
    createClient().auth.onAuthStateChange((_e, session) => Sentry.setUser(session?.user?.id ? { id: session.user.id } : null));
  }
} catch (e) {
  console.warn("posthog init failed", e);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
