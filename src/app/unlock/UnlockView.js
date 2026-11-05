"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CreditCard, KeyRound, School } from "lucide-react";
import { IconTile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import RazorpayPay from "./RazorpayPay";

export default function UnlockView({ price, hasAccess, preview, pay }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(hasAccess);
  const keyDetails = useRef(null);

  useEffect(() => {
    const syncKeyDisclosure = () => {
      if (keyDetails.current) keyDetails.current.open = window.location.hash === "#key";
    };
    syncKeyDisclosure();
    window.addEventListener("hashchange", syncKeyDisclosure);
    return () => window.removeEventListener("hashchange", syncKeyDisclosure);
  }, []);

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
        <p className="mt-2 text-muted">You can watch every module as it premieres, every Sunday at 10 AM.</p>
        <Link href="/course" className="btn-primary mt-6">Go to the course</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <IconTile icon={CreditCard} tone="success" />
        <h2 className="mt-4 text-lg font-semibold">Pay online</h2>
        <p className="mt-1 text-sm text-muted">One payment unlocks modules 1–6, including the ones still to premiere.</p>
        <RazorpayPay price={price} {...pay} />
      </section>

      <details ref={keyDetails} id="key" className="card scroll-mt-24 p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <IconTile icon={School} />
          <span className="flex-1 font-semibold">Have a school key?</span>
          <span className="text-sm font-medium text-primary">Enter key</span>
        </summary>
        <div className="mt-3 border-t border-border pt-4">
          <p className="text-sm text-muted">Enter the access key from your teacher. It looks like BT-XXXX-XXXX.</p>
          <form onSubmit={redeem} className="mt-4 space-y-3">
            <input className="input font-mono uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="BT-XXXX-XXXX" required={!preview} autoComplete="off" />
            {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
            <button disabled={busy} className="btn-primary w-full"><KeyRound className="h-4 w-4" /> {busy ? "Checking…" : "Unlock with key"}</button>
          </form>
          <p className="mt-4 text-xs text-muted">Each key works for one student only.</p>
        </div>
      </details>
    </div>
  );
}
