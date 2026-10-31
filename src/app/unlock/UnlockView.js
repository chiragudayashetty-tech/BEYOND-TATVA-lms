"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, CreditCard, ExternalLink, KeyRound, RefreshCw, School, ShieldCheck } from "lucide-react";
import { IconTile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

// Payments happen on the website. After paying there, the course unlocks here automatically when the
// student signs in with the email or parent phone used at checkout.
function EnrollOnWebsite({ price, enrollUrl, signedInAs }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  async function checkAgain() {
    setChecking(true);
    const { data } = await createClient().rpc("claim_purchases");
    setChecking(false);
    setChecked(true);
    if (data > 0) router.refresh();
  }

  return (
    <>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-semibold">₹{price}</span>
        <span className="text-sm text-muted">one time · incl. GST</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {["Every paid module and its lessons", "Quizzes, assignments and feedback", "Certificate at the end"].map((t) => (
          <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
        ))}
      </ul>
      <a href={enrollUrl} target="_blank" rel="noopener" className="btn-primary mt-5 w-full"><ExternalLink className="h-4 w-4" /> Enroll on beyondtatva.in</a>
      <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4 text-sm">
        <p className="font-semibold">Already paid?</p>
        <p className="mt-1 text-muted">
          The course unlocks on this account when the email or parent&apos;s phone used at checkout matches it.
          {signedInAs && <> You&apos;re signed in as <b className="text-fg">{signedInAs}</b>.</>}
        </p>
        <button onClick={checkAgain} disabled={checking} className="btn-secondary mt-3 w-full"><RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} /> {checking ? "Checking…" : "Check for my payment"}</button>
        {checked && !checking && (
          <p role="status" className="mt-2 text-muted">No payment found for this account yet. If you paid with a different email or phone, message us and we&apos;ll link it.</p>
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout on our website: UPI, cards and netbanking.</p>
    </>
  );
}

export default function UnlockView({ price, hasAccess, preview, enrollUrl, signedInAs }) {
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
        <h2 className="mt-4 text-lg font-semibold">Enroll online</h2>
        <p className="mt-1 text-sm text-muted">One payment unlocks modules 1–6, including the ones still to premiere.</p>
        <EnrollOnWebsite price={price} enrollUrl={enrollUrl} signedInAs={signedInAs} />
      </section>
    </div>
  );
}
