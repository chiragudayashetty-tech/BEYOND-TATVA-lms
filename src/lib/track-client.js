// Browser-side product events (PostHog). Safe to call anywhere: a no-op until PostHog is set up, and it never
// throws. Only pass non-personal properties (ids, counts, scores), never names, emails or phones.
import posthog from "posthog-js";

export function track(event, properties) {
  try {
    if (posthog.__loaded) posthog.capture(event, properties);
  } catch {
    // ignore
  }
}
