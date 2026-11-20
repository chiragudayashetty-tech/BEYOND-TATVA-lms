import "server-only";

// Read-only PostHog + Sentry data for Studio → Analytics → Live tracking, so Chirag never has to open either site.
// Keys are server-only (Vercel): POSTHOG_PERSONAL_API_KEY (scope query:read) and SENTRY_READ_TOKEN (scopes
// event:read, project:read, org:read). Answers are cached for 5 minutes. Nothing here returns names or contacts.
const PH_HOST = (process.env.POSTHOG_API_HOST || "https://eu.posthog.com").replace(/\/$/, "");
const PH_PROJECT = process.env.POSTHOG_PROJECT_ID || "359453";
const SENTRY_API = "https://de.sentry.io/api/0";
const SENTRY_ORG = "beyond-tatva";
const SENTRY_PROJECT = "beyond-tatva";
const NOISE = "event NOT IN ('setup_verification')";

export const monitoringReady = () => ({
  posthog: Boolean(process.env.POSTHOG_PERSONAL_API_KEY),
  sentry: Boolean(process.env.SENTRY_READ_TOKEN),
});

async function hogql(query) {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${PH_HOST}/api/projects/${PH_PROJECT}/query/`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      console.error("posthog query failed", r.status);
      return null;
    }
    const data = await r.json();
    return (data.results ?? []).map((row) => Object.fromEntries((data.columns ?? []).map((c, i) => [c, row[i]])));
  } catch (e) {
    console.error("posthog query error", e.message);
    return null;
  }
}

async function sentry(path) {
  const token = process.env.SENTRY_READ_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(`${SENTRY_API}${path}`, {
      headers: { authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      console.error("sentry api failed", path.split("?")[0], r.status);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error("sentry api error", e.message);
    return null;
  }
}

const n = (v) => Number(v) || 0;

// Everything PostHog knows, summarised for one window of `days` days.
export async function posthogSummary(days) {
  const since = `timestamp > now() - INTERVAL ${days} DAY`;
  const [overview, funnel, daily, pages, sources, devices, vitals, problems, countries] = await Promise.all([
    hogql(`SELECT
        uniqIf(person_id, event = '$pageview' AND properties.app = 'website') AS website_visitors,
        uniqIf(properties.$session_id, properties.app = 'website') AS website_sessions,
        uniqIf(person_id, event = '$pageview' AND properties.app = 'lms') AS lms_active,
        countIf(event = '$pageview') AS pageviews,
        sumIf(toFloat(properties.amount_inr), event = 'payment_completed') AS revenue
      FROM events WHERE ${since} AND ${NOISE}`),
    hogql(`SELECT event, uniq(person_id) AS people, count() AS times FROM events
      WHERE ${since} AND event IN ('signed_up','onboarding_completed','checkout_started','payment_completed','lesson_completed','quiz_submitted')
      GROUP BY event`),
    hogql(`SELECT toDate(toTimeZone(timestamp, 'Asia/Kolkata')) AS day,
        uniqIf(person_id, properties.app = 'website') AS website, uniqIf(person_id, properties.app = 'lms') AS lms
      FROM events WHERE ${since} AND event = '$pageview' GROUP BY day ORDER BY day LIMIT 100`),
    hogql(`SELECT properties.app AS app, properties.$pathname AS path, count() AS views, uniq(person_id) AS people
      FROM events WHERE ${since} AND event = '$pageview' GROUP BY app, path ORDER BY views DESC LIMIT 15`),
    hogql(`SELECT coalesce(nullIf(properties.utm_source, ''), nullIf(properties.$referring_domain, '$direct'), 'Direct / WhatsApp / typed') AS source,
        uniq(person_id) AS people
      FROM events WHERE ${since} AND event = '$pageview' AND properties.app = 'website' GROUP BY source ORDER BY people DESC LIMIT 10`),
    hogql(`SELECT coalesce(properties.$device_type, 'Unknown') AS device, uniq(person_id) AS people
      FROM events WHERE ${since} AND event = '$pageview' GROUP BY device ORDER BY people DESC LIMIT 5`),
    hogql(`SELECT properties.app AS app,
        round(quantile(0.75)(toFloat(properties.$web_vitals_FCP_value))) AS fcp_ms,
        round(quantile(0.75)(toFloat(properties.$web_vitals_LCP_value))) AS lcp_ms,
        round(quantile(0.75)(toFloat(properties.$web_vitals_INP_value))) AS inp_ms,
        round(quantile(0.75)(toFloat(properties.$web_vitals_CLS_value)), 3) AS cls
      FROM events WHERE ${since} AND event = '$web_vitals' GROUP BY app`),
    hogql(`SELECT event, properties.app AS app, properties.$pathname AS path, count() AS times FROM events
      WHERE ${since} AND event IN ('$rageclick','$dead_click','$exception') GROUP BY event, app, path ORDER BY times DESC LIMIT 12`),
    hogql(`SELECT coalesce(properties.$geoip_city_name, 'Unknown') AS city, uniq(person_id) AS people FROM events
      WHERE ${since} AND event = '$pageview' GROUP BY city ORDER BY people DESC LIMIT 8`),
  ]);
  if (!overview) return null;
  const o = overview[0] ?? {};
  const f = Object.fromEntries((funnel ?? []).map((r) => [r.event, { people: n(r.people), times: n(r.times) }]));
  return {
    websiteVisitors: n(o.website_visitors), websiteSessions: n(o.website_sessions), lmsActive: n(o.lms_active),
    pageviews: n(o.pageviews), revenue: n(o.revenue),
    funnel: f, daily: daily ?? [], pages: pages ?? [], sources: sources ?? [], devices: devices ?? [],
    vitals: vitals ?? [], problems: problems ?? [], cities: countries ?? [],
  };
}

// Open Sentry problems, error volume and monitors.
export async function sentrySummary() {
  const [issues, monitors, uptime] = await Promise.all([
    sentry(`/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?query=is:unresolved&statsPeriod=14d&sort=freq&limit=10`),
    sentry(`/organizations/${SENTRY_ORG}/monitors/?project=-1`),
    sentry(`/organizations/${SENTRY_ORG}/uptime/?project=-1`),
  ]);
  if (!issues) return null;
  return {
    issues: issues.map((i) => ({ id: i.shortId, title: i.title, where: i.culprit, count: n(i.count), users: n(i.userCount), lastSeen: i.lastSeen, level: i.level, url: i.permalink })),
    monitors: (monitors ?? []).map((m) => ({ name: m.name, status: m.environments?.[0]?.status ?? m.status, lastCheckIn: m.environments?.[0]?.lastCheckIn ?? null })),
    uptime: (uptime ?? []).map((u) => ({ name: u.name, url: u.url, status: u.uptimeStatus === 1 || u.uptimeStatus === "ok" ? "up" : u.uptimeStatus === 2 || u.uptimeStatus === "failed" ? "down" : String(u.uptimeStatus ?? "unknown") })),
  };
}
