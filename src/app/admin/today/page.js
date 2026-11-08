import { AlertTriangle, CalendarClock, IndianRupee, School, Users } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { COURSE_ID } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, isPreview, requireRole } from "@/lib/supabase/server";
import { statusTone } from "@/lib/outreach";
import { addDays, due, groupByTab, isDueNow, istToday, leadsToFollow, schoolsToFollow, shortDate, telLink, waLink } from "@/lib/today";
import ContactActions from "./ContactActions";

export const metadata = { title: "Today · Studio · Beyond Tatva" };
export const dynamic = "force-dynamic";

const DUE = { overdue: ["danger", "Overdue"], today: ["warning", "Today"], soon: ["primary", "Upcoming"] };
function DueBadge({ date, today }) {
  const d = due(date, today);
  if (!DUE[d]) return null;
  return <Badge tone={DUE[d][0]}>{DUE[d][1]} · {shortDate(date)}</Badge>;
}

// Leads come from sheet_snapshot (signed up / Module 0 / paid are computed there). It is service-role only,
// so this page checks the admin role first and never hands the raw snapshot to the browser.
async function loadLeads() {
  if (isPreview) return { leads: [], error: null };
  try {
    const { data, error } = await createAdminClient().rpc("sheet_snapshot", { p_course: COURSE_ID });
    return { leads: data?.leads ?? [], error: error?.message ?? null };
  } catch (e) {
    return { leads: [], error: e.message };
  }
}

export default async function TodayPage() {
  if (!isPreview) {
    const { profile } = await requireRole(["admin"]);
    if (profile?.role !== "admin") return null;
  }
  const today = istToday();
  const weekAgo = `${addDays(today, -7)}T00:00:00+05:30`; // the last 7 days, IST
  const supabase = await createClient();
  const [{ data: schoolRows }, { count: paidWeek }, { leads: leadRows, error: leadError }] = await Promise.all([
    supabase.from("outreach_schools").select("id, name, area, contact, phone, status, next_step, next_date, history, calls, visits"),
    supabase.from("purchases").select("id", { count: "exact", head: true }).in("status", ["pending", "claimed"]).gte("created_at", weekAgo),
    loadLeads(),
  ]);
  const schools = schoolsToFollow(schoolRows, today);
  const leads = leadsToFollow(leadRows, today);
  const groups = groupByTab(leads);

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Today" subtitle="Who to contact, and what happened. Every log also shows up in the Google Sheets within 5 minutes." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Schools due" value={schools.filter((s) => isDueNow(s, today)).length} hint="today or overdue" icon={School} tone="warning" />
        <StatCard label="Leads due" value={leads.filter((l) => isDueNow(l, today)).length} hint="today or overdue" icon={Users} tone="warning" />
        <StatCard label="Paid this week" value={paidWeek ?? 0} hint="last 7 days" icon={IndianRupee} tone="success" />
      </div>

      <Card title={`Schools to follow up (${schools.length})`} className="mb-6">
        {schools.length === 0 ? (
          <Empty icon={CalendarClock} title="No schools to follow up" body="Schools show here when their next date is within a week, or they are at Meeting set / Workshop booked. Add and edit schools in School outreach." />
        ) : (
          <ul className="divide-y divide-border">
            {schools.map((s) => (
              <li key={s.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted">{[s.area, s.contact, s.phone].filter(Boolean).join(" · ") || "No contact yet"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.status && <Badge tone={statusTone(s.status)}>{s.status}</Badge>}
                    <DueBadge date={s.next_date} today={today} />
                  </div>
                </div>
                {s.next_step && <p className="mt-2 text-sm"><span className="text-muted">Next:</span> {s.next_step}</p>}
                <p className="mt-1 text-xs text-muted">{s.calls} call{s.calls === 1 ? "" : "s"} · {s.visits} visit{s.visits === 1 ? "" : "s"}</p>
                {s.history && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-muted">History</summary>
                    <p className="mt-1 whitespace-pre-wrap break-words">{s.history}</p>
                  </details>
                )}
                <ContactActions kind="school" id={s.id} status={s.status} today={today} tel={telLink(s.phone)} wa={waLink(s.phone, { name: s.contact })} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Leads to follow up (${leads.length})`}>
        {leadError && (
          <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger"><AlertTriangle size={16} /> Leads could not be loaded right now. Try again in a minute.</p>
        )}
        {!leadError && leads.length === 0 ? (
          <Empty icon={Users} title="No leads to follow up" body="Leads show here when they are not paid, not marked do-not-contact, and due within a week or still open." />
        ) : (
          <div className="space-y-6">
            {groups.map(([tab, rows]) => (
              <section key={tab}>
                <h3 className="mb-2 text-sm font-semibold text-muted">{tab} · {rows.length}</h3>
                <ul className="divide-y divide-border">
                  {rows.map((l) => (
                    <li key={l.id} className="py-4 first:pt-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{l.student || "No name"}{l.grade ? <span className="font-normal text-muted"> · Class {l.grade}</span> : null}</p>
                          <p className="text-sm text-muted">{[l.school, l.phone && `+91 ${l.phone}`].filter(Boolean).join(" · ")}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {l.status && <Badge tone="primary">{l.status}</Badge>}
                          <Badge tone={l.signed_up ? "success" : "neutral"}>{l.signed_up ? "Signed up" : "Not signed up"}</Badge>
                          {l.signed_up && <Badge tone={l.module0 ? "success" : "neutral"}>{l.module0 ? "Module 0 done" : "Module 0 not yet"}</Badge>}
                          <DueBadge date={l.next_date} today={today} />
                        </div>
                      </div>
                      {l.next_step && <p className="mt-2 text-sm"><span className="text-muted">Next:</span> {l.next_step}</p>}
                      <ContactActions kind="lead" id={l.id} status={l.status} today={today} tel={telLink(l.phone)} wa={waLink(l.phone, { student: l.student })} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}
