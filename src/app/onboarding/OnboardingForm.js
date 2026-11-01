"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, House, Info, Users } from "lucide-react";
import Logo from "@/components/Logo";
import { IconTile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const who = [
  { id: "student", icon: GraduationCap, label: "I'm the student", body: "I'm in Grade 8, 9 or 10" },
  { id: "parent", icon: House, label: "I'm a parent", body: "I'm setting this up for my child" },
  { id: "teacher", icon: Users, label: "I'm a teacher", body: "I teach at a partner school" },
];

// One login per child: the account is always the student's, set up by the student or a parent.
export default function OnboardingForm({ defaultName, next, signedInAs, loginPhone }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [by, setBy] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", school: "", grade: "", gName: "", gPhone: "", kidPhone: "", consent: false });
  const done = () => { router.replace(next ?? "/dashboard"); router.refresh(); };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const parent = by === "parent";
  const teacher = by === "teacher";

  function choose(id) {
    setBy(id);
    // Prefill what we already know: the signed-in person's name, and a parent's own login phone.
    setForm((f) => ({
      ...f,
      name: id === "parent" ? "" : defaultName,
      gName: id === "parent" ? defaultName : "",
      gPhone: id === "parent" && loginPhone ? loginPhone.replace(/^\+?91/, "") : "",
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("complete_onboarding", teacher
      ? { p_role: "teacher", p_full_name: form.name, p_code: form.code }
      : {
          p_role: "student",
          p_full_name: form.name,
          p_code: form.code,
          p_grade: Number(form.grade),
          p_guardian_name: form.gName,
          p_guardian_phone: form.gPhone,
          p_school_name: form.school,
          p_signed_up_by: by,
          p_student_phone: form.kidPhone || null,
          p_consent: form.consent,
        });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    if (!teacher) {
      await supabase.rpc("claim_purchases"); // paid on the website before signing up? unlock now
      try {
        const tags = JSON.parse(localStorage.getItem("bt_signup_source") ?? "null");
        if (tags) {
          const { src, ...utm } = tags;
          await supabase.rpc("record_signup_source", { p_source: src ?? null, p_utm: utm });
          localStorage.removeItem("bt_signup_source");
        }
      } catch {}
    }
    done();
  }

  return (
    <div className="grid min-h-screen bg-bg place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="mb-4 flex gap-2">
          {[1, 2].map((s) => <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-border"}`} />)}
        </div>

        <div className="card p-6 shadow-xl shadow-black/5 sm:p-8">
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-semibold">Who is signing in?</h1>
              <p className="mt-1 text-sm text-muted">One account per student. A parent can set it up for their child.</p>
              <div className="mt-6 space-y-3">
                {who.map((r) => (
                  <button key={r.id} onClick={() => choose(r.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${by === r.id ? "border-primary bg-primary-soft ring-4 ring-primary/10" : "border-border hover:bg-surface-2"}`}>
                    <IconTile icon={r.icon} size="lg" tone={by === r.id ? "primary" : "neutral"} />
                    <span>
                      <span className="block font-semibold">{r.label}</span>
                      <span className="text-sm text-muted">{r.body}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button disabled={!by} onClick={() => setStep(2)} className="btn-primary mt-6 w-full py-3">Continue</button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-2xl font-semibold">{teacher ? "A few details" : parent ? "About your child" : "About you"}</h1>
              {parent && signedInAs && (
                <p className="flex gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <span>The course can be opened only with this login: <b>{signedInAs}</b>. Your child signs in with the same Google account or phone number.</span>
                </p>
              )}
              <label className="block">
                <span className="label">{teacher ? "Your full name" : parent ? "Your child's full name" : "Your full name"}</span>
                <input className="input" value={form.name} onChange={set("name")} maxLength={80} required />
              </label>
              {teacher ? (
                <label className="block">
                  <span className="label">Teacher code (from Beyond Tatva)</span>
                  <input className="input uppercase tracking-wider" value={form.code} onChange={set("code")} placeholder="SCHOOL-TEACH-XXX" required />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="label">Grade</span>
                    <div className="grid grid-cols-3 gap-2">
                      {["8", "9", "10"].map((g) => (
                        <button type="button" key={g} onClick={() => setForm((f) => ({ ...f, grade: g }))}
                          className={`rounded-xl border py-2.5 font-semibold transition ${form.grade === g ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">School name</span>
                    <input className="input" value={form.school} onChange={set("school")} maxLength={120} placeholder="e.g. Vidyodaya Public School, Udupi" />
                  </label>
                  <label className="block">
                    <span className="label">School code (only if the school gave one)</span>
                    <input className="input uppercase tracking-wider" value={form.code} onChange={set("code")} placeholder="Leave empty if you joined on your own" />
                  </label>
                  <div className="rounded-xl border border-border bg-surface-2 p-4">
                    <p className="font-semibold">{parent ? "You (parent or guardian)" : "Your parent or guardian"}</p>
                    <p className="text-xs text-muted">Course updates go to this WhatsApp number.</p>
                    <div className="mt-3 space-y-3">
                      <input className="input" value={form.gName} onChange={set("gName")} placeholder={parent ? "Your name" : "Parent's name"} required />
                      <input className="input" type="tel" inputMode="numeric" value={form.gPhone} onChange={set("gPhone")} placeholder={parent ? "Your 10-digit WhatsApp number" : "Parent's 10-digit WhatsApp number"} required />
                    </div>
                  </div>
                  <label className="block">
                    <span className="label">{parent ? "Your child's phone (optional)" : "Your own phone (optional)"}</span>
                    <input className="input" type="tel" inputMode="numeric" value={form.kidPhone} onChange={set("kidPhone")} placeholder="10-digit mobile" />
                  </label>
                  <label className="flex min-h-11 items-start gap-3 text-sm">
                    <input type="checkbox" checked={form.consent} onChange={set("consent")} className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" required />
                    <span>{parent
                      ? "I am the parent or guardian, and I agree to my child using Beyond Tatva."
                      : "My parent or guardian knows I'm joining Beyond Tatva and agrees."}</span>
                  </label>
                </>
              )}
              {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setStep(1); setError(""); }} className="btn-secondary">Back</button>
                <button disabled={busy || (!teacher && (!form.grade || !form.consent))} className="btn-primary flex-1 py-3">{busy ? "Setting up…" : "Finish"}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
