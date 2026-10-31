"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, CreditCard, KeyRound, School, ShieldCheck, Tag } from "lucide-react";
import { IconTile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const rupees = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Loads Razorpay Checkout once, on demand.
function loadCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load")));
    s.onerror = () => reject(new Error("Razorpay failed to load"));
    document.body.appendChild(s);
  });
}

async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

function PayOnline({ price, preview, initialCoupon }) {
  const router = useRouter();
  const [coupon, setCoupon] = useState(initialCoupon ?? "");
  const [applied, setApplied] = useState(null); // quote with a coupon
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function applyCoupon() {
    setMsg("");
    if (!coupon.trim()) return setApplied(null);
    try {
      const q = await post("/api/payments/quote", { coupon });
      if (q.couponInvalid) { setApplied(null); return setMsg("That coupon code isn't valid."); }
      setApplied(q);
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function pay() {
    setBusy(true);
    setMsg("");
    try {
      const [Razorpay, order] = await Promise.all([loadCheckout(), post("/api/payments/order", { coupon: applied?.coupon ?? "", parentConsent: consent })]);
      const rzp = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Beyond Tatva",
        description: order.courseTitle,
        image: `${window.location.origin}/brand/mark-trim.png`,
        prefill: order.prefill,
        theme: { color: "#4F46E5" },
        modal: { ondismiss: () => setBusy(false), confirm_close: true },
        handler: async (r) => {
          try {
            await post("/api/payments/verify", r);
            router.replace("/course?welcome=1");
            router.refresh();
          } catch (e) {
            setBusy(false);
            setMsg(e.message);
          }
        },
      });
      rzp.on("payment.failed", (r) => setMsg(r?.error?.description ? `Payment failed: ${r.error.description}` : "Payment failed. No money was taken; try again."));
      rzp.open();
    } catch (e) {
      setBusy(false);
      setMsg(e.message === "Razorpay failed to load" ? "Couldn't load the payment window. Check your internet and try again." : e.message);
    }
  }

  const amount = applied ? applied.amountPaise : price * 100;
  return (
    <>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-semibold">{rupees(amount)}</span>
        {applied?.discountPaise > 0 && <span className="text-sm text-muted line-through">{rupees(applied.listPaise)}</span>}
        <span className="text-sm text-muted">one time · incl. GST</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {["Every paid module and its lessons", "In-video quick checks and XP", "Quizzes, project feedback and certificate"].map((t) => (
          <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
        ))}
      </ul>
      <div className="mt-5 flex gap-2">
        <input className="input uppercase tracking-wider" value={coupon} onChange={(e) => { setCoupon(e.target.value); setApplied(null); }} placeholder="Coupon code" autoComplete="off" disabled={preview} />
        <button type="button" onClick={applyCoupon} disabled={preview || !coupon.trim()} className="btn-secondary shrink-0"><Tag className="h-4 w-4" /> Apply</button>
      </div>
      {applied?.coupon && <p className="mt-2 text-sm text-success">{applied.coupon} applied: {applied.percentOff}% off.</p>}
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
        <span>I am the student&apos;s parent or guardian, or they have agreed to this purchase.</span>
      </label>
      <button onClick={pay} disabled={preview || busy || !consent} className="btn-primary mt-4 w-full"><CreditCard className="h-4 w-4" /> {busy ? "Opening payment…" : `Pay ${rupees(amount)} with Razorpay`}</button>
      {msg && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{msg}</p>}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> UPI, cards and netbanking. Access unlocks on this account the moment payment succeeds.</p>
    </>
  );
}

export default function UnlockView({ price, hasAccess, preview, initialCoupon }) {
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
        <p className="mt-1 text-sm text-muted">One payment unlocks modules 1–6, including the ones still to premiere.</p>
        <PayOnline price={price} preview={preview} initialCoupon={initialCoupon} />
      </section>
    </div>
  );
}
