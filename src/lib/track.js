import "server-only";

// Server-side PostHog events for steps the browser can miss (payments, sign-ups). Plain fetch to the capture
// API: no extra package. Never throws and never waits more than 2 s. Students are minors: send the account id
// as distinct_id and only non-personal properties (no names, emails or phones).
export async function trackServer(event, distinctId, properties = {}) {
  const key = (process.env.NEXT_PUBLIC_POSTHOG_KEY || "").trim();
  if (!key || !distinctId) return;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");
  try {
    await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: key, event, distinct_id: String(distinctId), properties: { ...properties, $lib: "lms-server" } }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // analytics must never break a payment or a sign-up
  }
}
