"use client";

import { useActionState, useTransition } from "react";
import { ArrowRight, CircleCheck, KeyRound, Plus } from "lucide-react";
import { createClass, createSchool, grantAccess, moveAccess } from "../actions";

function Status({ state }) {
  if (!state) return null;
  return state.ok
    ? <span className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="h-4 w-4" /> Saved</span>
    : <span role="alert" className="text-sm text-danger">{state.error}</span>;
}

export function NewSchool() {
  const [state, action, pending] = useActionState(createSchool, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
      <label><span className="label">School name</span><input name="name" className="input" placeholder="St. Mary's School" required /></label>
      <label><span className="label">City</span><input name="city" className="input" placeholder="Udupi" /></label>
      <button disabled={pending} className="btn-primary"><Plus className="h-4 w-4" /> {pending ? "Adding…" : "Add school"}</button>
      <div className="sm:col-span-3"><Status state={state} /></div>
    </form>
  );
}

export function NewClass({ schools, teachers }) {
  const [state, action, pending] = useActionState(createClass, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">School</span>
        <select name="school" className="input" required defaultValue="">
          <option value="" disabled>Choose a school</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label><span className="label">Class name</span><input name="name" className="input" placeholder="Grade 9 · A" required /></label>
      <label><span className="label">Grade</span>
        <select name="grade" className="input" required defaultValue="">
          <option value="" disabled>Grade</option>
          {[8, 9, 10].map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
      </label>
      <label><span className="label">Teacher (optional)</span>
        <select name="teacher" className="input" defaultValue="">
          <option value="">No teacher yet</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary"><Plus className="h-4 w-4" /> {pending ? "Adding…" : "Add class"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function GrantButton({ studentId }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => grantAccess(studentId))} className="btn-secondary px-3 py-1.5 text-xs">
      <KeyRound className="h-3.5 w-3.5" /> {pending ? "Granting…" : "Give access"}
    </button>
  );
}

// For students who signed up twice (e.g. Google and email): access lives on one account only.
export function MoveAccess({ students }) {
  const [state, action, pending] = useActionState(moveAccess, null);
  const label = (s) => `${s.full_name}${s.email ? ` · ${s.email}` : ""} · ${s.id.slice(0, 6)}`;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
      <label><span className="label">From (has access)</span>
        <select name="from" className="input" required defaultValue="">
          <option value="" disabled>Choose account</option>
          {students.filter((s) => s.access).map((s) => <option key={s.id} value={s.id}>{label(s)} · {s.access}</option>)}
        </select>
      </label>
      <ArrowRight className="mx-auto mb-3 hidden h-4 w-4 text-muted sm:block" />
      <label><span className="label">To (student&apos;s real account)</span>
        <select name="to" className="input" required defaultValue="">
          <option value="" disabled>Choose account</option>
          {students.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
        </select>
      </label>
      <button disabled={pending} className="btn-primary">{pending ? "Moving…" : "Move access"}</button>
      <div className="sm:col-span-4"><Status state={state} /></div>
    </form>
  );
}
