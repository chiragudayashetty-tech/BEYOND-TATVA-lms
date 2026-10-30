"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, GraduationCap, House, Users } from "lucide-react";
import Logo from "@/components/Logo";
import { IconTile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const roles = [
  { id: "student", icon: GraduationCap, label: "Student", body: "I'm in Grade 8, 9 or 10" },
  { id: "parent", icon: House, label: "Parent", body: "I want to follow my child's learning" },
  { id: "teacher", icon: Users, label: "Teacher", body: "I teach at a partner school" },
];

const codeLabel = {
  student: "School code (from your teacher)",
  teacher: "Teacher code (from Beyond Tatva)",
  parent: "Your child's code (in their app)",
};

export default function OnboardingForm({ defaultName }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ name: defaultName, code: "", grade: "", gName: "", gPhone: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("complete_onboarding", {
      p_role: role,
      p_full_name: form.name,
      p_code: form.code,
      p_grade: role === "student" ? Number(form.grade) : null,
      p_guardian_name: role === "student" ? form.gName : null,
      p_guardian_phone: role === "student" ? form.gPhone : null,
    });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    if (role === "student") {
      const { data } = await supabase.from("profiles").select("invite_code").single();
      setBusy(false);
      return setInviteCode(data?.invite_code ?? "");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen bg-bg place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= (inviteCode !== null ? 3 : step) ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        <div className="card p-6 shadow-xl shadow-black/5 sm:p-8">
          {inviteCode !== null ? (
            <div className="text-center">
              <div className="flex justify-center"><IconTile icon={CircleCheck} tone="success" size="lg" /></div>
              <h1 className="mt-3 mt-4 text-2xl font-semibold">You&apos;re in!</h1>
              <p className="mt-2 text-muted">Give this code to your parent. They sign in, pick &quot;Parent&quot; and enter it to see your progress and give consent.</p>
              <div className="mx-auto mt-6 w-fit rounded-2xl border border-dashed border-primary bg-primary-soft px-8 py-4 font-mono text-3xl font-semibold tracking-[0.3em] text-primary">
                {inviteCode}
              </div>
              <button onClick={() => { router.replace("/dashboard"); router.refresh(); }} className="btn-primary mt-8 w-full py-3">Start learning</button>
            </div>
          ) : step === 1 ? (
            <>
              <h1 className="text-2xl font-semibold">Who are you?</h1>
              <p className="mt-1 text-sm text-muted">This sets up the right experience for you.</p>
              <div className="mt-6 space-y-3">
                {roles.map((r) => (
                  <button key={r.id} onClick={() => setRole(r.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${role === r.id ? "border-primary bg-primary-soft ring-4 ring-primary/10" : "border-border hover:bg-surface-2"}`}>
                    <IconTile icon={r.icon} size="lg" tone={role === r.id ? "primary" : "neutral"} />
                    <span>
                      <span className="block font-semibold">{r.label}</span>
                      <span className="text-sm text-muted">{r.body}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button disabled={!role} onClick={() => setStep(2)} className="btn-primary mt-6 w-full py-3">Continue</button>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-2xl font-semibold">A few details</h1>
              <label className="block">
                <span className="label">Your full name</span>
                <input className="input" value={form.name} onChange={set("name")} maxLength={80} required />
              </label>
              <label className="block">
                <span className="label">{codeLabel[role]}</span>
                <input className="input uppercase tracking-wider" value={form.code} onChange={set("code")} placeholder={role === "parent" ? "A1B2C3" : role === "teacher" ? "SCHOOL-TEACH-XXX" : "SCHOOL-CITY"} required />
              </label>
              {role === "student" && (
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
                  <div className="rounded-xl border border-border bg-surface-2 p-4">
                    <p className="font-semibold">Parent or guardian</p>
                    <p className="text-xs text-muted">We only use this to ask for their permission and share your progress.</p>
                    <div className="mt-3 space-y-3">
                      <input className="input" value={form.gName} onChange={set("gName")} placeholder="Guardian's name" required />
                      <input className="input" type="tel" value={form.gPhone} onChange={set("gPhone")} placeholder="Guardian's phone number" required />
                    </div>
                  </div>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={form.consent} onChange={set("consent")} className="mt-1 h-4 w-4 accent-[var(--primary)]" required />
                    <span>My parent or guardian knows I&apos;m joining Beyond Tatva. They will confirm by linking their account.</span>
                  </label>
                </>
              )}
              {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setStep(1); setError(""); }} className="btn-secondary">Back</button>
                <button disabled={busy || (role === "student" && !form.grade)} className="btn-primary flex-1 py-3">{busy ? "Setting up…" : "Finish"}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
