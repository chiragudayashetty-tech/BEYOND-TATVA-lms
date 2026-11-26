"use client";

import { useActionState, useTransition } from "react";
import { CircleCheck, Flag, Square } from "lucide-react";
import { endRace, setSchoolBatch, startRace } from "../actions";

const LENGTHS = [[24, "24 hours"], [48, "48 hours"], [72, "3 days"], [168, "1 week"]];

export function StartRaceForm({ schools }) {
  const [state, action, pending] = useActionState(startRace, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="label">School</span>
        <select name="school" className="input" required defaultValue="">
          <option value="" disabled>Pick the school you just visited</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? `, ${s.city}` : ""} · {s.students} students</option>)}
        </select>
      </label>
      <label><span className="label">Starts</span><input name="start" type="datetime-local" className="input" />
        <span className="mt-1 block text-xs text-muted">Leave empty to start now (IST).</span></label>
      <label><span className="label">Runs for</span>
        <select name="hours" className="input" defaultValue="48">{LENGTHS.map(([h, l]) => <option key={h} value={h}>{l}</option>)}</select>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}><Flag className="h-4 w-4" /> {pending ? "Starting…" : "Start race"}</button>
        {state?.ok && <span className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="h-4 w-4" /> Race is set. Students of that school see it on their Course page.</span>}
        {state && !state.ok && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      </div>
      <p className="text-xs text-muted sm:col-span-2">Starting a race at a school that already has one replaces it. Students only see class names, never counts or other students.</p>
    </form>
  );
}

export function EndRaceButton({ schoolId, live }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn-secondary" disabled={pending}
      onClick={() => { if (confirm(live ? "End this race now? Students see the final result for 3 days." : "Remove this race?")) start(() => endRace(schoolId)); }}>
      <Square className="h-4 w-4" /> {pending ? "…" : live ? "End now" : "Remove"}
    </button>
  );
}

// Module 1 opens at this date and time for the whole school; then one module every 7 days.
export function SchoolBatchRow({ school }) {
  const [state, action, pending] = useActionState(setSchoolBatch, null);
  const value = school.batch_start
    ? new Date(new Date(school.batch_start).getTime() + 330 * 60000).toISOString().slice(0, 16) // UTC → IST wall time
    : "";
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 px-5 py-4">
      <input type="hidden" name="school" value={school.id} />
      <div className="min-w-40 flex-1">
        <p className="font-medium">{school.name}</p>
        <p className="text-xs text-muted">{school.students} students · {school.batch_start ? "own batch" : "no school batch (weekly batches by join date)"}</p>
      </div>
      <label className="w-full sm:w-auto"><span className="sr-only">Module 1 opens (IST)</span>
        <input name="start" type="datetime-local" defaultValue={value} className="input" /></label>
      <button className="btn-secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      {state?.ok && <span className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="h-4 w-4" /> Saved</span>}
      {state && !state.ok && <span role="alert" className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
