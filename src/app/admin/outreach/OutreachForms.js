"use client";

import { useActionState, useState, useTransition } from "react";
import { CircleCheck, Footprints, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { deleteOutreachSchool, logOutreach, saveOutreachSchool } from "../actions";

function Status({ state }) {
  if (!state) return null;
  return state.ok
    ? <span className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="h-4 w-4" /> Saved</span>
    : <span role="alert" className="text-sm text-danger">{state.error}</span>;
}

export function OutreachForm({ statuses, school, onDone }) {
  const [state, action, pending] = useActionState(async (prev, fd) => {
    const res = await saveOutreachSchool(prev, fd);
    if (res.ok && onDone) onDone();
    return res;
  }, null);
  const s = school ?? {};
  const status = s.status && !statuses.includes(s.status) ? [s.status, ...statuses] : statuses;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {school && <input type="hidden" name="id" value={school.id} />}
      <label><span className="label">School name</span><input name="name" defaultValue={s.name} className="input" placeholder="Vidyodaya Public School" required maxLength={160} /></label>
      <label><span className="label">Area</span><input name="area" defaultValue={s.area ?? ""} className="input" placeholder="Udupi town" maxLength={160} /></label>
      <label><span className="label">Contact person</span><input name="contact" defaultValue={s.contact ?? ""} className="input" placeholder="Principal / coordinator" maxLength={160} /></label>
      <label><span className="label">Phone</span><input name="phone" type="tel" defaultValue={s.phone ?? ""} className="input" placeholder="98450 12345" maxLength={40} /></label>
      <label><span className="label">Status</span>
        <select name="status" defaultValue={s.status || "Not contacted"} className="input">{status.map((x) => <option key={x}>{x}</option>)}</select>
      </label>
      <label><span className="label">Next follow-up date</span><input name="next_date" type="date" defaultValue={s.next_date ?? ""} className="input" /></label>
      <label className="sm:col-span-2"><span className="label">Next step</span><input name="next_step" defaultValue={s.next_step ?? ""} className="input" placeholder="Call principal to fix a demo date" maxLength={300} /></label>
      <label className="sm:col-span-2"><span className="label">Notes</span><textarea name="notes" defaultValue={s.notes ?? ""} rows={2} className="input" maxLength={2000} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary">{school ? "Save changes" : <><Plus className="h-4 w-4" /> Add school</>}</button>
        {pending && <span className="text-sm text-muted">Saving…</span>}
        <Status state={state} />
      </div>
    </form>
  );
}

export function OutreachRow({ school, statuses }) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [pending, start] = useTransition();
  const log = (kind) => start(async () => {
    const res = await logOutreach(school.id, kind, note);
    setError(res.ok ? null : res.error);
    if (res.ok) setNote("");
  });
  const remove = () => {
    if (!confirm(`Delete ${school.name} from outreach? It is also removed from the School Outreach sheet within 5 minutes.`)) return;
    start(async () => { const res = await deleteOutreachSchool(school.id); if (!res.ok) setError(res.error); });
  };
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input min-w-0 flex-1 basis-48" placeholder="What happened? (optional)" maxLength={200} aria-label={`Note for ${school.name}`} />
        <button type="button" disabled={pending} onClick={() => log("call")} className="btn-secondary"><Phone className="h-4 w-4" /> Log call</button>
        <button type="button" disabled={pending} onClick={() => log("visit")} className="btn-secondary"><Footprints className="h-4 w-4" /> Log visit</button>
        <button type="button" onClick={() => setEditing((v) => !v)} className="btn-secondary"><Pencil className="h-4 w-4" /> {editing ? "Close" : "Edit"}</button>
        <button type="button" disabled={pending} onClick={remove} className="btn-secondary text-danger" aria-label={`Delete ${school.name}`}><Trash2 className="h-4 w-4" /></button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {school.history && (
        <div className="text-xs">
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="text-primary underline">{showHistory ? "Hide history" : "Show history"}</button>
          {showHistory && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-muted">{school.history}</pre>}
        </div>
      )}
      {school.notes && !editing && <p className="text-xs text-muted">{school.notes}</p>}
      {editing && <div className="rounded-xl border border-border p-3"><OutreachForm statuses={statuses} school={school} onDone={() => setEditing(false)} /></div>}
    </div>
  );
}
