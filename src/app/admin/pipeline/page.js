import Link from "next/link";
import { CopyCheck, Download, Filter } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { COURSE_ID } from "@/lib/catalog";
import { STAGES, STALL_HOURS } from "@/lib/pipeline";
import { OUTCOMES, applyFilters, classSections, facets, filterQuery, groupBySchool, parseFilters, sortRows } from "@/lib/crm";
import { todayIST } from "@/lib/outreach";
import { createClient } from "@/lib/supabase/server";
import { NotesButton } from "./CrmNotes";
import { ClearLeadsButton, DeleteLeadButton } from "./LeadActions";
import AddLeads from "./AddLeads";

export const metadata = { title: "Pipeline · Studio · Beyond Tatva" };

const date = (t) => (t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : null);
const mins = (s) => `${Math.round((s ?? 0) / 60)} min`;

export default async function PipelinePage({ searchParams }) {
  const sp = await searchParams;
  const { stage: stageParam, stalled, view: viewParam, followups } = sp;
  const f = parseFilters(sp);
  const today = todayIST();
  const view = viewParam === "schools" ? "schools" : "parents";
  const stage = STAGES.find((s) => String(s.id) === stageParam)?.id ?? null;
  const supabase = await createClient();
  const [{ data, error }, { data: notes }] = await Promise.all([
    supabase.rpc("admin_pipeline", { p_course: COURSE_ID, p_stall_hours: STALL_HOURS }),
    supabase.from("crm_notes").select("*").order("created_at", { ascending: false }),
  ]);
  const byPerson = new Map();
  // A note may carry a student id, a lead id or both; index it under each so it follows the person after sign-up.
  for (const note of notes ?? []) {
    for (const key of [note.student_id, note.lead_id]) if (key) byPerson.set(key, [...(byPerson.get(key) ?? []), note]);
  }
  const notesFor = (r) => [...new Set([...(byPerson.get(r.student_id) ?? []), ...(byPerson.get(r.lead_id) ?? [])])];
  const now = new Date();
  const isDue = (r) => notesFor(r).some((n) => !n.done_at && n.follow_up_at && new Date(n.follow_up_at) <= now);
  // School enquiries (principals from the /schools form) are counted apart from parents and students.
  const everyone = (data ?? []).filter((r) => (view === "schools") === (r.source === "schools"));
  const choices = facets(everyone);
  // School / class / section / status / source / siblings / due / search (src/lib/crm.js). Stage cards count after these.
  const all = applyFilters(everyone, f, today, isDue);
  const rows = sortRows(all.filter((r) => (stage ? r.stage === stage : true) && (stalled ? r.stalled : true) && (followups ? isDue(r) : true)));
  const bySchool = f.group === "school" && !f.school ? groupBySchool(all) : null;
  const breakdown = f.school ? classSections(all) : null;
  const filtered = Boolean(filterQuery({ ...f, group: null }));
  const count = (id) => all.filter((r) => r.stage === id).length;
  const stalledCount = all.filter((r) => r.stalled).length;
  const dueCount = all.filter(isDue).length;
  const href = (q, change = {}) => {
    const qs = [view === "schools" && "view=schools", filterQuery(f, change), q].filter(Boolean).join("&");
    return `/admin/pipeline${qs ? `?${qs}` : ""}`;
  };

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Pipeline" subtitle="Everyone from lead to paid, one row per student (siblings separate). Filter by school, class, section or status, or group by school.">
        <a href={`/admin/pipeline/export?view=${view}${stage ? `&stage=${stage}` : ""}${filterQuery(f) ? `&${filterQuery(f)}` : ""}`} className="btn-secondary"><Download size={16} /> Export CSV</a>
        <Link href="/admin/pipeline/duplicates" className="btn-secondary"><CopyCheck size={16} /> Duplicates</Link>
        <ClearLeadsButton source={view === "schools" ? "schools" : null} label={view === "schools" ? "Clear school enquiries" : "Clear all leads"} />
      </PageTitle>

      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">Couldn&apos;t load the pipeline: {error.message}</p>}

      <AddLeads />

      <div className="mb-4 flex gap-2" role="tablist">
        {[["parents", "Parents & students", ""], ["schools", "School enquiries", "view=schools"]].map(([id, label, q]) => (
          <Link key={id} href={`/admin/pipeline${q ? `?${q}` : ""}`} role="tab" aria-selected={view === id}
            className={view === id ? "btn-primary" : "btn-secondary"}>{label}</Link>
        ))}
      </div>
      <form method="get" action="/admin/pipeline" className="card mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="Filters">
        {view === "schools" && <input type="hidden" name="view" value="schools" />}
        {f.group && <input type="hidden" name="group" value={f.group} />}
        <label className="col-span-2 sm:col-span-3 lg:col-span-2"><span className="label">School</span>
          <select name="school" defaultValue={f.school ?? ""} className="input"><option value="">All schools</option>{[...(f.school && !choices.schools.some((x) => x.toLowerCase() === f.school.toLowerCase()) ? [f.school] : []), ...choices.schools].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label><span className="label">Class</span>
          <select name="class" defaultValue={f.grade ?? ""} className="input"><option value="">All</option>{choices.grades.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label><span className="label">Section</span>
          <select name="section" defaultValue={f.section ?? ""} className="input"><option value="">All</option>{choices.sections.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label><span className="label">Status</span>
          <select name="status" defaultValue={f.outcome ?? ""} className="input"><option value="">All</option>{OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label><span className="label">Source</span>
          <select name="source" defaultValue={f.source ?? ""} className="input"><option value="">All</option>{choices.sources.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="col-span-2 sm:col-span-3 lg:col-span-2"><span className="label">Search</span>
          <input name="q" defaultValue={f.q ?? ""} className="input" placeholder="Name or phone" /></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="siblings" value="1" defaultChecked={f.siblings} className="h-5 w-5" /> Siblings only</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="due" value="1" defaultChecked={f.due} className="h-5 w-5" /> Due today / overdue</label>
        <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-3 lg:col-span-2">
          <button className="btn-primary min-h-11"><Filter size={16} /> Apply</button>
          {filtered && <Link href={view === "schools" ? "/admin/pipeline?view=schools" : "/admin/pipeline"} className="btn-secondary min-h-11">Clear</Link>}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={href(followups ? "" : "followups=1")} className="btn-secondary min-h-11">Follow-ups due ({dueCount}){followups ? " · Show all" : ""}</Link>
        <Link href={href("", { group: f.group ? null : "school", school: null })} className={`${f.group ? "btn-primary" : "btn-secondary"} min-h-11`}>Group by school</Link>
      </div>

      {bySchool && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bySchool.map((g) => (
            <Link key={g.school} href={href("", { school: g.school, group: null })} className="card p-4 transition hover:bg-surface-2">
              <div className="font-semibold">{g.school}</div>
              <div className="mt-1 text-2xl font-semibold">{g.total} <span className="text-sm font-normal text-muted">leads</span></div>
              <div className="mt-1 text-xs text-muted">{g.open} open · {g.won} won · {g.lost} lost{g.dnc ? ` · ${g.dnc} do not contact` : ""}</div>
              <div className="mt-1 text-xs font-medium text-success">{Math.round(g.conversion * 1000) / 10}% converted</div>
            </Link>
          ))}
        </div>
      )}

      {breakdown && breakdown.length > 0 && (
        <Card title={`${f.school}: by class and section`} className="mb-6" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="px-4 py-2">Class</th><th className="px-4 py-2">Section</th><th className="px-4 py-2">Leads</th><th className="px-4 py-2">Open</th><th className="px-4 py-2">Won</th><th className="px-4 py-2">Lost</th><th className="px-4 py-2">Conv.</th></tr></thead>
              <tbody className="divide-y divide-border border-t border-border">
                {breakdown.map((b) => (
                  <tr key={`${b.grade}-${b.section}`}>
                    <td className="px-4 py-2"><Link className="text-primary underline" href={href("", { grade: Number(b.grade) || null, section: null })}>{b.grade}</Link></td>
                    <td className="px-4 py-2"><Link className="text-primary underline" href={href("", { grade: Number(b.grade) || null, section: b.section === "–" ? null : b.section })}>{b.section}</Link></td>
                    <td className="px-4 py-2">{b.total}</td><td className="px-4 py-2">{b.open}</td><td className="px-4 py-2">{b.won}</td><td className="px-4 py-2">{b.lost + b.dnc}</td>
                    <td className="px-4 py-2">{Math.round(b.conversion * 1000) / 10}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAGES.map((s) => (
          <Link key={s.id} href={href(stage === s.id ? "" : `stage=${s.id}`)}
            className={`card p-4 transition hover:bg-surface-2 ${stage === s.id ? "ring-4 ring-primary/20 border-primary" : ""}`}>
            <div className="text-xs text-muted">{s.id}. {s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{count(s.id)}</div>
            <div className="mt-1 text-xs text-subtle">{s.body}</div>
          </Link>
        ))}
      </div>

      <Card pad={false}
        title={`${stage ? STAGES[stage - 1].label : "Everyone"}${stalled ? " · stopped" : ""} (${rows.length})`}
        action={
          <Link href={href(stalled ? (stage ? `stage=${stage}` : "") : `stalled=1${stage ? `&stage=${stage}` : ""}`)} className="inline-flex min-h-11 items-center gap-1 text-xs text-primary">
            <Filter size={14} /> {stalled ? "Show all" : `Stopped watching > ${STALL_HOURS}h (${stalledCount})`}
          </Link>
        }>
        {rows.length === 0 ? (
          <div className="p-5"><Empty icon={Filter} title={filtered ? "No one matches these filters" : "Nobody here yet"} body={filtered ? "Change or clear the filters." : "Website leads appear once the website sends them to the LMS. Students appear when they sign in."} /></div>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {rows.slice(0, 500).map((r) => (
              <li key={r.student_id ?? r.lead_id} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.name}</div>
                  <div className="truncate text-xs text-muted">
                    {[r.parent_name && `Parent: ${r.parent_name}`, r.phone, r.grade && `Class ${r.grade}${r.section ? ` ${r.section}` : ""}`, r.school].filter(Boolean).join(" · ")}
                  </div>
                  {(r.status || r.next_date || r.siblings) && (
                    <div className="mt-0.5 text-xs">
                      {[r.status && `Status: ${r.status}`, r.next_date && `Next: ${r.next_step ? `${r.next_step}, ` : ""}${r.next_date}`].filter(Boolean).join(" · ")}
                      {r.siblings && <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">Sibling of {r.siblings}</span>}
                    </div>
                  )}
                  <div className="text-xs text-subtle">
                    {[r.lead_at && `Lead ${date(r.lead_at)}`, r.signed_up_at && `Signed in ${date(r.signed_up_at)}`,
                      r.seconds_watched > 0 && `Watched ${mins(r.seconds_watched)} (last ${date(r.last_watch_at)})`,
                      r.bought_at && `Bought ${date(r.bought_at)}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={STAGES[r.stage - 1].tone}>{STAGES[r.stage - 1].label}</Badge>
                  {r.outcome && r.outcome !== "open" && <Badge tone={OUTCOMES.find((o) => o.id === r.outcome)?.tone}>{OUTCOMES.find((o) => o.id === r.outcome)?.label}</Badge>}
                  {r.stalled && <Badge tone="danger">Stopped</Badge>}
                  {r.source && <span className="text-[11px] text-subtle">from {r.source}</span>}
                  <NotesButton person={r} notes={notesFor(r)} />
                  <DeleteLeadButton leadId={r.lead_id} name={r.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {rows.length > 500 && <p className="mt-2 text-xs text-muted">Showing the newest 500. Export CSV for everyone.</p>}
    </Shell>
  );
}
