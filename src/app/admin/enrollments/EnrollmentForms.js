"use client";

import { useActionState, useTransition } from "react";
import { Plus, Undo2, UserCheck } from "lucide-react";
import FormStatus from "@/components/FormStatus";
import { addEnrollment, assignEnrollment, revokeEnrollment } from "../actions";

export function AddEnrollment() {
  const [state, action, pending] = useActionState(addEnrollment, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">Student&apos;s email</span><input name="email" type="email" className="input" placeholder="kid@gmail.com" /></label>
      <label><span className="label">Parent&apos;s phone</span><input name="phone" type="tel" inputMode="numeric" className="input" placeholder="98450 12345" /></label>
      <label><span className="label">Student&apos;s name</span><input name="student" className="input" placeholder="Optional" /></label>
      <label><span className="label">Amount paid (₹)</span><input name="amount" type="number" min={0} step="0.01" className="input" placeholder="999" /></label>
      <label className="sm:col-span-2"><span className="label">Payment reference</span><input name="reference" className="input" placeholder="UPI ref / receipt no. (optional, prevents adding it twice)" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary"><Plus className="h-4 w-4" /> {pending ? "Adding…" : "Add enrollment"}</button>
        <FormStatus state={state} />
      </div>
      <p className="text-xs text-muted sm:col-span-2">Use this for UPI, cash or school payments. Website payments arrive here on their own.</p>
    </form>
  );
}

export function RevokeButton({ reference }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => confirm("Refunded? This removes the course from the student's account.") && start(() => revokeEnrollment(reference))}
      className="btn-ghost px-2 py-1 text-xs text-danger"><Undo2 className="h-3.5 w-3.5" /> {pending ? "Revoking…" : "Refunded"}</button>
  );
}

export function AssignForm({ purchaseId, students }) {
  const [state, action, pending] = useActionState(assignEnrollment, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="purchase" value={purchaseId} />
      <select name="student" className="input h-8 w-44 py-0 text-xs" required defaultValue="">
        <option value="" disabled>Give to student…</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.guardian_phone ? ` · ${s.guardian_phone.slice(-4)}` : ""}</option>)}
      </select>
      <button disabled={pending} className="btn-secondary px-2 py-1 text-xs"><UserCheck className="h-3.5 w-3.5" /> Unlock</button>
      {state && !state.ok && <FormStatus state={state} />}
    </form>
  );
}
