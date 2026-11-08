import Link from "next/link";
import { School } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { OUTREACH_STATUSES, statusTone, todayIST } from "@/lib/outreach";
import { OutreachForm, OutreachRow } from "./OutreachForms";

export const metadata = { title: "School outreach · Admin · Beyond Tatva" };

const fmt = (d) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

export default async function OutreachPage({ searchParams }) {
  const { status: filter } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("outreach_schools")
    .select("id, name, area, contact, phone, status, calls, visits, history, next_step, next_date, notes, updated_at")
    .order("next_date", { ascending: true, nullsFirst: false }).order("name");
  const all = data ?? [];
  const today = todayIST();
  const due = all.filter((s) => s.next_date && s.next_date <= today && s.status !== "Not interested");
  const won = all.filter((s) => ["Workshop booked", "Workshop done", "Partner"].includes(s.status)).length;
  const counts = Object.fromEntries(OUTREACH_STATUSES.map((st) => [st, all.filter((s) => (s.status || "Not contacted") === st).length]));
  const rows = filter === "due" ? due : filter ? all.filter((s) => (s.status || "Not contacted") === filter) : all;
  const chip = (key, label, n) => (
    <Link key={key} href={key ? `?status=${encodeURIComponent(key)}` : "?"} className={`chip ${filter === key || (!filter && !key) ? "bg-primary text-primary-fg" : "bg-surface-2"}`}>{label} · {n}</Link>
  );

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="School outreach" subtitle="Every school you approach: who to talk to, calls and visits so far, and the next follow-up. Edits made in the School Outreach Google Sheet also show up here." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Schools" value={all.length} />
        <StatCard label="Follow-ups due" value={due.length} tone={due.length ? "warning" : "success"} hint="Today or overdue" />
        <StatCard label="Calls · visits" value={`${all.reduce((n, s) => n + s.calls, 0)} · ${all.reduce((n, s) => n + s.visits, 0)}`} />
        <StatCard label="Workshops / partners" value={won} tone="success" />
      </div>

      <Card title="Add a school" className="mb-6"><OutreachForm statuses={OUTREACH_STATUSES} /></Card>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {chip(null, "All", all.length)}
        {chip("due", "Due", due.length)}
        {OUTREACH_STATUSES.filter((st) => counts[st]).map((st) => chip(st, st, counts[st]))}
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-danger">{error.message}</p>}
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.name}</span>
                    <Badge tone={statusTone(s.status)}>{s.status || "Not contacted"}</Badge>
                    {s.next_date && s.next_date <= today && s.status !== "Not interested" && <Badge tone="danger">{s.next_date < today ? "Overdue" : "Today"}</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {[s.area, s.contact, s.phone && <a key="p" href={`tel:${s.phone}`} className="underline">{s.phone}</a>].filter(Boolean).reduce((acc, x, i) => (i ? [...acc, " · ", x] : [x]), [])}
                    {!s.area && !s.contact && !s.phone && "No contact yet"}
                  </div>
                  {(s.next_step || s.next_date) && <p className="mt-2 text-sm"><b>Next:</b> {s.next_step || "Follow up"}{s.next_date && ` · ${fmt(s.next_date)}`}</p>}
                  <p className="mt-1 text-xs text-muted">{s.calls} calls · {s.visits} visits</p>
                </div>
              </div>
              <OutreachRow school={s} statuses={OUTREACH_STATUSES} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={School} title={all.length ? "No schools here" : "No schools yet"} body={all.length ? "Try another filter." : "Add the first school you plan to approach."} />
      )}
    </Shell>
  );
}
