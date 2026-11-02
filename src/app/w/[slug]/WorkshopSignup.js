"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function WorkshopSignup({ slug, open }) {
  const [form, setForm] = useState({ student: "", grade: "", parent: "", phone: "", consent: false });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const { data, error: rpcError } = await createClient().rpc("register_workshop", {
      p_slug: slug, p_student_name: form.student.trim(), p_grade: Number(form.grade), p_parent_name: form.parent.trim(), p_parent_phone: form.phone, p_consent: form.consent,
    });
    setBusy(false);
    if (rpcError) setError(rpcError.message);
    else setMessage(data === "already" ? "This WhatsApp number is already registered for the workshop." : "You’re registered. We’ll contact your parent or guardian on WhatsApp with the details.");
  }
  return <Card title="Sign up">
    {!open ? <p className="text-sm text-muted">Sign-up is closed for this workshop.</p> : <form onSubmit={submit} className="space-y-3">
      <label className="block"><span className="label">Student name</span><input required maxLength={80} className="input" autoComplete="name" value={form.student} onChange={update("student")} /></label>
      <label className="block"><span className="label">Grade</span><select required className="input" value={form.grade} onChange={update("grade")}><option value="">Choose grade</option>{[8, 9, 10].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}</select></label>
      <label className="block"><span className="label">Parent or guardian name</span><input required maxLength={80} className="input" autoComplete="name" value={form.parent} onChange={update("parent")} /></label>
      <label className="block"><span className="label">Parent WhatsApp number</span><input required type="tel" inputMode="tel" autoComplete="tel" className="input" placeholder="10-digit mobile number" value={form.phone} onChange={update("phone")} /></label>
      <label className="flex min-h-11 items-start gap-3 text-sm"><input required type="checkbox" checked={form.consent} onChange={update("consent")} className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" /><span>I am the parent or guardian and agree to Beyond Tatva contacting me on WhatsApp about this workshop.</span></label>
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-success-soft p-3 text-sm text-success">{message}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Signing you up…" : "Sign up"}</button>
    </form>}
  </Card>;
}
