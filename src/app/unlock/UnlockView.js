"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CreditCard, KeyRound, School } from "lucide-react";
import { IconTile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { isInApp } from "@/lib/android-app";
import RazorpayPay from "./RazorpayPay";
import PriceTag from "@/components/PriceTag";
import AppNoPurchase from "@/components/AppNoPurchase";

export default function UnlockView({ price, listPrice, hasAccess, preview, pay }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(hasAccess);
  const keyDetails = useRef(null);

  useEffect(() => {
    const syncKeyDisclosure = () => {
      // Inside the Play Store app the key is the only thing on this page, so keep it open.
      if (keyDetails.current) keyDetails.current.open = window.location.hash === "#key" || isInApp();
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
      <AppNoPurchase className="self-start" />
      <section className="web-only card p-6">
        <IconTile icon={CreditCard} tone="success" />
        <h2 className="mt-4 text-lg font-semibold">Pay online</h2>
        <p className="mt-1 text-sm text-muted">One payment unlocks modules 1–5, including the ones still to premiere.</p>
        <PriceTag price={price} listPrice={listPrice} className="mt-4 !justify-start" />
        <RazorpayPay price={price} {...pay} />
        <p className="mt-3 text-xs text-muted">Full refund within 7 days if no more than 1 paid lesson is watched. <Link href="/refund-policy" className="font-medium text-primary">Refund policy</Link></p>
      </section>

      <details ref={keyDetails} id="key" className="card scroll-mt-24 p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <IconTile icon={School} />
          <span className="flex-1 font-semibold">Have an access key?</span>
          <span className="text-sm font-medium text-primary">Enter key</span>
        </summary>
        <div className="mt-3 border-t border-border pt-4">
          <p className="text-sm text-muted">Enter the key from your school<span className="web-only">, or the one we sent you on WhatsApp after paying</span>. It looks like BT-XXXX-XXXX.</p>
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
