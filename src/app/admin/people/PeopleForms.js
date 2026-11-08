"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowRight, CircleCheck, KeyRound, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createClass, createSchool, deleteStudent, exportStudent, grantAccess, moveAccess, setTeacherRevoked } from "../actions";

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

export function SignupSchoolToggle({ schoolId, schoolName, initialShow, statusAvailable }) {
  const [show, setShow] = useState(initialShow);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    const next = !show;
    setShow(next);
    setError("");
    start(async () => {
      const { error: updateError } = await createClient().rpc("admin_set_signup_school", { p_school: schoolId, p_show: next });
      if (updateError) {
        setShow(!next);
        setError("Couldn’t save. Try again.");
      }
    });
  }

  if (!statusAvailable) return <span className="text-xs text-warning">Signup status unavailable</span>;
  return (
    <div className="min-w-36">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" role="switch" checked={show} onChange={toggle} disabled={pending} aria-label={`Show ${schoolName} at signup`} className="h-5 w-5 accent-[var(--primary)]" />
        <span>Show at signup</span>
        {pending && <span className="text-xs text-muted">Saving…</span>}
      </label>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
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

// DPDP requests from a parent: download all of a student's data, or delete the account for good.
export function StudentDataButtons({ studentId, name }) {
  const [pending, start] = useTransition();
  function download() {
    start(async () => {
      const r = await exportStudent(studentId);
      if (!r.ok) return alert(r.error);
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `student-data-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  function remove() {
    const typed = prompt(`Delete ${name}'s account and all their data (progress, quiz attempts, assignments, uploads)? This can't be undone. Payments stay in Enrollments without the student link; leads are kept.\n\nType the student's full name to confirm:`);
    if (typed == null) return;
    start(async () => {
      const r = await deleteStudent(studentId, typed);
      alert(r.ok ? r.message : r.error);
    });
  }
  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" disabled={pending} onClick={download} className="btn-ghost px-3 py-1 text-xs">Export</button>
      <button type="button" disabled={pending} onClick={remove} className="btn-ghost px-3 py-1 text-xs text-danger">Delete</button>
    </div>
  );
}

export function TeacherRevoke({ teacherId, name, revoked }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending}
      onClick={() => (revoked || confirm(`Remove ${name}'s teacher access? They lose the course and their class list.`)) && start(() => setTeacherRevoked(teacherId, !revoked))}
      className={revoked ? "btn-secondary px-3 py-1 text-xs" : "btn-ghost px-3 py-1 text-xs text-danger"}>
      {pending ? "Saving…" : revoked ? "Restore" : "Revoke"}
    </button>
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
