"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, CreditCard, KeyRound, School, ShieldCheck } from "lucide-react";
import { IconTile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function UnlockView({ price, hasAccess, preview }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(hasAccess);

  async function redeem(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (preview) {
      document.cookie = "preview_access=1; path=/; max-age=86400";
      setBusy(false);
      setOk(true);
      return router.refresh();
    }
    const { error } = await createClient().rpc("redeem_access_key", { p_code: code });
    setBusy(false);
    if (error) return setError(error.message);
    setOk(true);
    router.refresh();
  }

  if (ok) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className="flex justify-center"><IconTile icon={CircleCheck} tone="success" size="lg" /></div>
        <h2 className="mt-4 text-2xl font-semibold">Full course unlocked</h2>
        <p className="mt-2 text-muted">You can watch every module as it premieres, every Sunday at 6 PM.</p>
        <Link href="/course" className="btn-primary mt-6">Go to the course</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section id="key" className="card scroll-mt-24 p-6">
        <IconTile icon={School} />
        <h2 className="mt-4 text-lg font-semibold">My school gave me a key</h2>
        <p className="mt-1 text-sm text-muted">Enter the access key from your teacher. It looks like BT-XXXX-XXXX.</p>
        <form onSubmit={redeem} className="mt-5 space-y-3">
          <input className="input font-mono uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="BT-XXXX-XXXX" required={!preview} autoComplete="off" />
          {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <button disabled={busy} className="btn-primary w-full"><KeyRound className="h-4 w-4" /> {busy ? "Checking…" : "Unlock with key"}</button>
        </form>
        <p className="mt-4 text-xs text-muted">Each key works for one student only.</p>
      </section>

      <section className="card p-6">
        <IconTile icon={CreditCard} tone="success" />
        <h2 className="mt-4 text-lg font-semibold">Pay online</h2>
        <p className="mt-1 text-sm text-muted">One payment unlocks all 6 modules, including the ones still to premiere.</p>
        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-semibold">₹{price}</span>
          <span className="text-sm text-muted">one time · incl. GST</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {["All 6 modules and 24 lessons", "Weekly live doubt-clearing class", "Quizzes, project feedback and certificate"].map((t) => (
            <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
          ))}
        </ul>
        <button disabled className="btn-primary mt-5 w-full"><CreditCard className="h-4 w-4" /> Pay with Razorpay</button>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> UPI, cards and netbanking. Online payment opens soon; ask your school for a key meanwhile.</p>
      </section>
    </div>
  );
}
