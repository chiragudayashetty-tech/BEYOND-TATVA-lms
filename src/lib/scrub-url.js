// Query values that must never reach analytics or error reports (phone numbers, payment ids, codes, tokens).
// Used by src/instrumentation-client.js for PostHog and Sentry. Other params (utm_*, next…) are kept.
const SECRET = new Set(["paid", "phone", "id", "c", "code", "token", "email", "mobile", "access_token", "refresh_token", "token_hash"]);

export function scrubUrl(value) {
  if (typeof value !== "string" || !value.includes("?") && !value.includes("#")) return value;
  try {
    const u = new URL(value, "https://x.invalid");
    let changed = false;
    for (const k of [...u.searchParams.keys()]) if (SECRET.has(k.toLowerCase())) { u.searchParams.set(k, "x"); changed = true; }
    if (u.hash && /token|code=/i.test(u.hash)) { u.hash = ""; changed = true; }
    if (!changed) return value;
    return u.origin === "https://x.invalid" ? u.pathname + u.search + u.hash : u.toString();
  } catch {
    return value.split("?")[0];
  }
}

const URL_KEYS = ["$current_url", "$referrer", "$initial_current_url", "$initial_referrer", "$pathname", "$prev_pageview_pathname", "url"];
// PostHog before_send: scrub every URL-like property (and the same in $set / $set_once).
export function scrubEvent(event) {
  if (!event) return event;
  for (const bag of [event.properties, event.$set, event.$set_once, event.properties?.$set, event.properties?.$set_once]) {
    if (!bag || typeof bag !== "object") continue;
    for (const k of URL_KEYS) if (typeof bag[k] === "string") bag[k] = scrubUrl(bag[k]);
  }
  return event;
}
