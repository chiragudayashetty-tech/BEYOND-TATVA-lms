"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown, ClipboardCheck, ExternalLink, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import FormStatus from "@/components/FormStatus";
import { Badge, Card, Empty } from "@/components/ui";
import { deleteAssignment, gradeSubmission, saveAssignment } from "../actions";

const toIstInput = (iso) => (iso ? new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 16) : "");
const when = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function AssignmentForm({ chapterId, a, onDone }) {
  const [state, action, pending] = useActionState(async (prev, fd) => {
    const r = await saveAssignment(prev, fd);
    if (r.ok && !a) onDone?.();
    return r;
  }, null);
  const [deleting, startDelete] = useTransition();
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2">
      <input type="hidden" name="chapter" value={chapterId} />
      {a && <input type="hidden" name="id" value={a.id} />}
      <label className="sm:col-span-2"><span className="label">Title</span><input name="title" className="input" defaultValue={a?.title} required maxLength={120} placeholder="e.g. Make a study poster with AI" /></label>
      <label className="sm:col-span-2"><span className="label">Instructions</span><textarea name="instructions" rows={4} className="input" defaultValue={a?.instructions ?? ""} maxLength={4000} placeholder="What to do, what to hand in, how it's marked" /></label>
      <fieldset className="sm:col-span-2">
        <legend className="label">Students can hand in</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="allow_text" defaultChecked={a?.allow_text ?? true} className="h-4 w-4 accent-[var(--primary)]" /> Written answer</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="allow_link" defaultChecked={a?.allow_link ?? true} className="h-4 w-4 accent-[var(--primary)]" /> Link</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="allow_files" defaultChecked={a?.allow_files ?? false} className="h-4 w-4 accent-[var(--primary)]" /> Photos / PDF (up to 5, 10 MB each)</label>
        </div>
      </fieldset>
      <label><span className="label">Out of (marks)</span><input name="max_marks" type="number" min={1} max={100} className="input" defaultValue={a?.max_marks ?? 10} required /></label>
      <label><span className="label">Due (IST, optional)</span><input name="due" type="datetime-local" className="input" defaultValue={toIstInput(a?.due_at)} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={a?.published ?? false} className="h-4 w-4 accent-[var(--primary)]" /> Published</label>
        <button disabled={pending} className="btn-primary px-3 py-2">{pending ? "Saving…" : a ? "Save" : "Add assignment"}</button>
        {a && (
          <button type="button" disabled={deleting} onClick={() => confirm("Delete this assignment and all submissions for it?") && startDelete(() => deleteAssignment(a.id))}
            className="btn-ghost px-3 py-2 text-danger"><Trash2 className="h-4 w-4" /> Delete</button>
        )}
        <FormStatus state={state} />
      </div>
    </form>
  );
}

function ReviewCard({ s, assignment }) {
  const [state, action, pending] = useActionState(gradeSubmission, null);
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{s.student}</div>
          <div className="text-xs text-muted">{assignment?.title ?? "Assignment"} · handed in {when(s.updated_at)}</div>
        </div>
        <Badge tone={{ submitted: "warning", graded: "success", returned: "neutral" }[s.status]}>
          {s.status === "graded" ? `${s.marks}/${assignment?.max_marks}` : s.status === "returned" ? "Sent back" : "To mark"}
        </Badge>
      </div>
      {s.text_answer && <p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm">{s.text_answer}</p>}
      {s.link_url && <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ExternalLink className="h-4 w-4" /> {s.link_url}</a>}
      {s.fileLinks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {s.fileLinks.map((f) => f.url && (/\.(jpe?g|png|webp|heic|heif)$/i.test(f.path)
            // eslint-disable-next-line @next/next/no-img-element
            ? <a key={f.path} href={f.url} target="_blank" rel="noopener noreferrer"><img src={f.url} alt="Submitted work" className="h-28 w-28 rounded-xl border border-border object-cover" /></a>
            : <a key={f.path} href={f.url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2 text-xs"><FileText className="h-4 w-4" /> {f.path.split("/").pop()}</a>))}
        </div>
      )}
      <form action={action} className="grid gap-2 sm:grid-cols-[110px_1fr]">
        <input type="hidden" name="id" value={s.id} />
        <input name="marks" type="number" min={0} max={assignment?.max_marks} className="input" defaultValue={s.marks ?? ""} placeholder={`/ ${assignment?.max_marks}`} aria-label="Marks" />
        <input name="feedback" className="input" defaultValue={s.feedback ?? ""} placeholder="Feedback for the student" maxLength={2000} />
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button name="action" value="grade" disabled={pending} className="btn-primary px-3 py-2"><ClipboardCheck className="h-4 w-4" /> {s.status === "graded" ? "Update marks" : "Mark"}</button>
          <button name="action" value="return" disabled={pending} className="btn-secondary px-3 py-2"><RotateCcw className="h-4 w-4" /> Send back to redo</button>
          <FormStatus state={state} />
        </div>
      </form>
    </li>
  );
}

export default function AssignmentStudio({ modules, assignments, submissions }) {
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const byId = Object.fromEntries(assignments.map((a) => [a.id, a]));
  const toMark = submissions.filter((s) => s.status === "submitted");
  const done = submissions.filter((s) => s.status !== "submitted");

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card title={`To mark (${toMark.length})`} pad={false} action={done.length > 0 && (
        <button onClick={() => setShowDone(!showDone)} className="text-sm font-medium text-primary">{showDone ? "Hide" : "Show"} marked ({done.length})</button>
      )}>
        {toMark.length === 0 && !showDone
          ? <div className="p-5"><Empty icon={ClipboardCheck} title="Nothing to mark" body="New submissions appear here." /></div>
          : <ul className="divide-y divide-border border-t border-border">{(showDone ? [...toMark, ...done] : toMark).map((s) => <ReviewCard key={s.id} s={s} assignment={byId[s.assignment_id]} />)}</ul>}
      </Card>

      <div className="space-y-3">
        {modules.map((m) => {
          const list = assignments.filter((a) => a.chapter_id === m.id);
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : m.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-subtle">Module {m.n}</div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted">{list.length ? `${list.length} assignment${list.length > 1 ? "s" : ""} · ${list.filter((a) => a.published).length} published` : "No assignments"}</div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-border bg-surface-2 p-4">
                  {list.map((a) => <AssignmentForm key={a.id} chapterId={m.id} a={a} />)}
                  {adding === m.id
                    ? <AssignmentForm chapterId={m.id} onDone={() => setAdding(null)} />
                    : <button onClick={() => setAdding(m.id)} className="btn-secondary"><Plus className="h-4 w-4" /> Add assignment</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
