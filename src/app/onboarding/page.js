"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const roles = [
  { id: "student", icon: "🎒", label: "Student", body: "I'm in Grade 8, 9 or 10" },
  { id: "parent", icon: "👨‍👩‍👧", label: "Parent", body: "I want to follow my child" },
  { id: "teacher", icon: "🧑‍🏫", label: "Teacher", body: "I teach at a partner school" },
];

export default function Onboarding() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [step, setStep] = useState(1);

  return (
    <div className="glow grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="mb-4 flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-teal" : "bg-surface-2"}`} />
          ))}
        </div>

        <div className="card p-7">
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold">Who are you?</h1>
              <p className="mt-1 text-sm text-muted">This sets up the right experience for you.</p>
              <div className="mt-6 space-y-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                      role === r.id ? "border-teal bg-teal/10" : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <span className="text-3xl">{r.icon}</span>
                    <span>
                      <span className="block font-semibold">{r.label}</span>
                      <span className="text-sm text-muted">{r.body}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button disabled={!role} onClick={() => setStep(2)} className="btn-primary mt-6 w-full py-3">Continue</button>
            </>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); router.push(`/${role}`); }} className="space-y-4">
              <h1 className="text-2xl font-bold">A few details</h1>
              <input className="input" placeholder="Full name" required />
              {role !== "parent" && <input className="input uppercase" placeholder="School code (e.g. UDP-SMS-24)" required />}
              {role === "student" && (
                <>
                  <select className="input" required defaultValue="">
                    <option value="" disabled>Grade</option>
                    <option>Grade 8</option><option>Grade 9</option><option>Grade 10</option>
                  </select>
                  <div className="rounded-xl border border-yellow/30 bg-yellow/5 p-4">
                    <p className="text-sm font-semibold text-yellow">Parent / guardian</p>
                    <div className="mt-3 space-y-3">
                      <input className="input" placeholder="Guardian's name" required />
                      <input className="input" type="tel" placeholder="Guardian's phone number" required />
                    </div>
                    <p className="mt-3 text-xs text-muted">We&apos;ll send them a link to give consent and see your progress.</p>
                  </div>
                </>
              )}
              {role === "parent" && <input className="input" placeholder="Child's invite code (from their account)" required />}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost">Back</button>
                <button className="btn-primary flex-1 py-3">Finish</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
