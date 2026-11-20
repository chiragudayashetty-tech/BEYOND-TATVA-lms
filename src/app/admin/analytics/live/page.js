import Link from "next/link";
import { Activity, Bug, Globe, IndianRupee, Users } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Bars, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { monitoringReady, posthogSummary, sentrySummary } from "@/lib/monitoring";

// Studio → Analytics → Live tracking: PostHog (visitors, funnel, pages, speed, frustration) and Sentry (errors,
// uptime, cron) in one page, so nobody has to open those sites. Server-rendered; data is at most 5 minutes old.
export const metadata = { title: "Live tracking · Studio · Beyond Tatva" };

const STEPS = [
  ["signed_up", "Signed up (password)"],
  ["onboarding_completed", "Finished details"],
  ["checkout_started", "Opened payment"],
  ["payment_completed", "Paid"],
  ["lesson_completed", "Finished a lesson"],
  ["quiz_submitted", "Took a quiz"],
];
const PROBLEM = { $rageclick: "Rage clicks (tapped again and again)", $dead_click: "Taps that did nothing", $exception: "Page errors" };
const inr = (v) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const ago = (iso) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
const vitalTone = (v, good, poor) => (v == null ? "neutral" : v <= good ? "success" : v <= poor ? "warning" : "danger");

export default async function LiveTrackingPage({ searchParams }) {
  const params = await searchParams;
  const days = [1, 7, 30, 90].includes(Number(params?.days)) ? Number(params.days) : 7;
  const ready = monitoringReady();
  const [ph, se] = await Promise.all([posthogSummary(days), sentrySummary()]);
  const daily = (ph?.daily ?? []).slice(-14);

  return <Shell roles={["admin"]}>
    <PageTitle title="Live tracking" subtitle="Website and LMS visitors, the student funnel, speed, errors and uptime. Updates every 5 minutes.">
      <div className="flex min-h-11 items-center gap-1 rounded-xl border border-border p-1" aria-label="Date range">{[1, 7, 30, 90].map((d) => <Link key={d} href={`/admin/analytics/live?days=${d}`} aria-current={days === d ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${days === d ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2"}`}>{d === 1 ? "Today" : `${d} days`}</Link>)}</div>
    </PageTitle>
    <nav className="mb-5 flex flex-wrap gap-2"><Link className="btn-secondary" href="/admin/analytics">Overview</Link><Link className="btn-secondary" href="/admin/analytics/students">Students</Link><Link className="btn-secondary" href="/admin/analytics/schools">Schools</Link><Link className="btn-primary" href="/admin/analytics/live">Live tracking</Link></nav>

    {(!ready.posthog || !ready.sentry) && <p role="status" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
      Not connected yet: {[!ready.posthog && "PostHog (add POSTHOG_PERSONAL_API_KEY in Vercel)", !ready.sentry && "Sentry (add SENTRY_READ_TOKEN in Vercel)"].filter(Boolean).join(" and ")}.
    </p>}
    {ready.posthog && !ph && <p role="alert" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">PostHog didn&apos;t answer. Try again in a minute.</p>}

    {ph && <>
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Website visitors" value={ph.websiteVisitors} hint={`${ph.websiteSessions} visits`} icon={Globe} />
        <StatCard label="Active in the LMS" value={ph.lmsActive} hint="Signed-in or browsing" icon={Users} />
        <StatCard label="Paid" value={ph.funnel.payment_completed?.people ?? 0} hint={`${ph.funnel.checkout_started?.people ?? 0} opened payment`} icon={IndianRupee} />
        <StatCard label="Revenue (online)" value={inr(ph.revenue)} hint="Razorpay payments" icon={Activity} />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card title="Student funnel">
          <ol className="space-y-2">{STEPS.map(([key, label], i) => {
            const people = ph.funnel[key]?.people ?? 0;
            const first = ph.funnel.signed_up?.people || ph.funnel.onboarding_completed?.people || 0;
            const pct = first ? Math.round((people / first) * 100) : 0;
            return <li key={key}><div className="flex justify-between text-sm"><span>{i + 1}. {label}</span><span className="font-semibold">{people}{i > 0 && first ? <span className="ml-2 text-xs font-normal text-muted">{pct}%</span> : null}</span></div>
              <div className="mt-1 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-primary" style={{ width: `${first ? Math.min(100, pct) : 0}%` }} /></div></li>;
          })}</ol>
          <p className="mt-3 text-xs text-muted">Google and WhatsApp sign-ins start at &quot;Finished details&quot;.</p>
        </Card>
        <Card title="Visitors per day">
          {daily.length ? <>
            <Bars data={daily.map((d) => ({ label: String(d.day).slice(8, 10), value: Number(d.website) || 0, extra: Number(d.lms) || 0 }))} valueLabel={(v) => `${v} website`} />
            <p className="mt-2 text-xs text-muted">Dark: website visitors. Light: LMS visitors.</p>
          </> : <Empty title="No visits yet" body="Bars appear after the first visitors." />}
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card title="Where visitors come from"><List rows={ph.sources} label="source" value="people" empty="No website visits yet" /></Card>
        <Card title="Devices"><List rows={ph.devices} label="device" value="people" empty="No data yet" /></Card>
        <Card title="Cities"><List rows={ph.cities} label="city" value="people" empty="No data yet" /></Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card title="Top pages">
          {ph.pages.length ? <ul className="divide-y divide-border text-sm">{ph.pages.map((p) => <li key={`${p.app}${p.path}`} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate"><Badge tone={p.app === "lms" ? "primary" : "neutral"}>{p.app || "?"}</Badge> <span className="ml-1">{p.path}</span></span><span className="shrink-0 text-muted">{p.views} views · {p.people} people</span></li>)}</ul> : <Empty title="No page views yet" />}
        </Card>
        <Card title="Speed (75% of visits load faster than this)">
          {ph.vitals.length ? <ul className="space-y-3 text-sm">{ph.vitals.map((v) => <li key={v.app} className="flex flex-wrap items-center gap-2"><span className="w-20 font-medium capitalize">{v.app || "?"}</span>
            <Badge tone={vitalTone(v.lcp_ms, 2500, 4000)}>Load {v.lcp_ms != null ? `${(v.lcp_ms / 1000).toFixed(1)} s` : "–"}</Badge>
            <Badge tone={vitalTone(v.inp_ms, 200, 500)}>Tap response {v.inp_ms ?? "–"} ms</Badge>
            <Badge tone={vitalTone(v.cls, 0.1, 0.25)}>Jumpiness {v.cls ?? "–"}</Badge></li>)}</ul> : <Empty title="No speed data yet" />}
          <p className="mt-3 text-xs text-muted">Green is good, amber needs work, red is slow (Google&apos;s limits).</p>
        </Card>
      </div>

      <Card title="Where students get stuck" className="mb-5">
        {ph.problems.length ? <ul className="divide-y divide-border text-sm">{ph.problems.map((p, i) => <li key={i} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{PROBLEM[p.event] ?? p.event} <span className="text-muted">on {p.app} {p.path}</span></span><span className="shrink-0 font-semibold">{p.times}</span></li>)}</ul> : <Empty title="Nothing yet" body="Rage clicks, taps that do nothing and page errors show here." />}
      </Card>
    </>}

    {ready.sentry && !se && <p role="alert" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">Sentry didn&apos;t answer. Try again in a minute.</p>}
    {se && <div className="mb-5 grid gap-5 lg:grid-cols-3">
      <Card title="Open errors (last 14 days)" className="lg:col-span-2">
        {se.issues.length ? <ul className="divide-y divide-border text-sm">{se.issues.map((i) => <li key={i.id} className="py-2">
          <div className="flex items-start justify-between gap-3"><a href={i.url} target="_blank" rel="noreferrer" className="min-w-0 font-medium hover:text-primary hover:underline"><Bug className="mr-1 inline h-4 w-4 text-danger" />{i.title}</a><span className="shrink-0 text-muted">{i.count}×</span></div>
          <div className="text-xs text-muted">{i.where} · {i.users} people · last {ago(i.lastSeen)} · {i.id}</div></li>)}</ul> : <Empty title="No open errors" body="Nothing is broken right now." />}
      </Card>
      <Card title="Uptime and jobs">
        <ul className="space-y-2 text-sm">
          {se.uptime.map((u) => <li key={u.url} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate">{u.name}</span><Badge tone={u.status === "up" ? "success" : u.status === "down" ? "danger" : "neutral"}>{u.status}</Badge></li>)}
          {se.monitors.map((m) => <li key={m.name} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate">{m.name} <span className="text-xs text-muted">({ago(m.lastCheckIn)})</span></span><Badge tone={m.status === "ok" ? "success" : m.status === "error" || m.status === "missed_checkin" || m.status === "timeout" ? "danger" : "neutral"}>{m.status}</Badge></li>)}
          {!se.uptime.length && !se.monitors.length && <li className="text-muted">No monitors yet.</li>}
        </ul>
      </Card>
    </div>}
  </Shell>;
}

function List({ rows, label, value, empty }) {
  if (!rows?.length) return <p className="text-sm text-muted">{empty}</p>;
  const top = Math.max(...rows.map((r) => Number(r[value]) || 0), 1);
  return <ul className="space-y-2 text-sm">{rows.map((r) => <li key={r[label]}><div className="flex justify-between gap-2"><span className="min-w-0 truncate">{r[label]}</span><span className="font-semibold">{r[value]}</span></div><div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${((Number(r[value]) || 0) / top) * 100}%` }} /></div></li>)}</ul>;
}
