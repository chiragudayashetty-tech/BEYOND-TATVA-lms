import Link from "next/link";
import { Download, Filter } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { COURSE_ID } from "@/lib/catalog";
import { STAGES, STALL_HOURS } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";
import { NotesButton } from "./CrmNotes";

export const metadata = { title: "Pipeline · Studio · Beyond Tatva" };

const date = (t) => (t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : null);
const mins = (s) => `${Math.round((s ?? 0) / 60)} min`;

export default async function PipelinePage({ searchParams }) {
  const { stage: stageParam, stalled, view: viewParam, followups } = await searchParams;
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
  const all = (data ?? []).filter((r) => (view === "schools") === (r.source === "schools"));
  const rows = all
    .filter((r) => (stage ? r.stage === stage : true) && (stalled ? r.stalled : true) && (followups ? isDue(r) : true))
    .sort((a, b) => new Date(b.signed_up_at ?? b.lead_at) - new Date(a.signed_up_at ?? a.lead_at));
  const count = (id) => all.filter((r) => r.stage === id).length;
  const stalledCount = all.filter((r) => r.stalled).length;
  const dueCount = all.filter(isDue).length;
  const href = (q) => {
    const qs = [view === "schools" && "view=schools", q].filter(Boolean).join("&");
    return `/admin/pipeline${qs ? `?${qs}` : ""}`;
  };

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Pipeline" subtitle="Everyone from website lead to paid, one row per person. A website lead and a student are matched by the parent's phone.">
        <a href={`/admin/pipeline/export?view=${view}${stage ? `&stage=${stage}` : ""}`} className="btn-secondary"><Download size={16} /> Export CSV</a>
      </PageTitle>

      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">Couldn&apos;t load the pipeline: {error.message}</p>}

      <div className="mb-4 flex gap-2" role="tablist">
        {[["parents", "Parents & students", ""], ["schools", "School enquiries", "view=schools"]].map(([id, label, q]) => (
          <Link key={id} href={`/admin/pipeline${q ? `?${q}` : ""}`} role="tab" aria-selected={view === id}
            className={view === id ? "btn-primary" : "btn-secondary"}>{label}</Link>
        ))}
      </div>
      <Link href={href(followups ? "" : "followups=1")} className="btn-secondary mb-4 min-h-11">Follow-ups due ({dueCount}){followups ? " · Show all" : ""}</Link>

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
          <Link href={href(stalled ? (stage ? `stage=${stage}` : "") : `stalled=1${stage ? `&stage=${stage}` : ""}`)} className="inline-flex items-center gap-1 text-xs text-primary">
            <Filter size={14} /> {stalled ? "Show all" : `Stopped watching > ${STALL_HOURS}h (${stalledCount})`}
          </Link>
        }>
        {rows.length === 0 ? (
          <div className="p-5"><Empty icon={Filter} title="Nobody here yet" body="Website leads appear once the website sends them to the LMS. Students appear when they sign in." /></div>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {rows.slice(0, 500).map((r) => (
              <li key={r.student_id ?? r.lead_id} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.name}</div>
                  <div className="truncate text-xs text-muted">
                    {[r.parent_name && `Parent: ${r.parent_name}`, r.phone, r.grade && `Grade ${r.grade}`, r.school].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-xs text-subtle">
                    {[r.lead_at && `Lead ${date(r.lead_at)}`, r.signed_up_at && `Signed in ${date(r.signed_up_at)}`,
                      r.seconds_watched > 0 && `Watched ${mins(r.seconds_watched)} (last ${date(r.last_watch_at)})`,
                      r.bought_at && `Bought ${date(r.bought_at)}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={STAGES[r.stage - 1].tone}>{STAGES[r.stage - 1].label}</Badge>
                  {r.stalled && <Badge tone="danger">Stopped</Badge>}
                  {r.source && <span className="text-[11px] text-subtle">from {r.source}</span>}
                  <NotesButton person={r} notes={notesFor(r)} />
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
