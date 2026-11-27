"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Lock, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { isInApp } from "@/lib/android-app";

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: "No internet connection." } };
  }
}

export default function GuestPay({ title, price, enabled, whatsapp }) {
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, price }
  const [couponError, setCouponError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text, paymentId? }
  const [paid, setPaid] = useState(null); // { phone, paymentId }

  const waLink = (paymentId) => whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(paymentId ? `Hi! I paid for the Beyond Tatva course. Payment ID: ${paymentId}` : "Hi! I want to pay for the Beyond Tatva AI course.")}`
    : null;
  const amount = coupon?.price ?? price;

  async function applyCoupon(e) {
    e.preventDefault();
    setCouponError("");
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { ok, data } = await post("/api/guest-order", { coupon: c, preview: true });
    if (!ok || !Number.isInteger(data.amount)) return setCouponError("That coupon code is not valid or has expired.");
    setCoupon({ code: c, price: data.amount / 100 });
  }

  const fail = (text, paymentId) => { setBusy(false); setMsg({ tone: "error", text, paymentId }); };

  async function pay() {
    if (isInApp()) return;
    if (!/^[6-9]\d{9}$/.test(mobile)) return setMsg({ tone: "error", text: "Enter your 10-digit WhatsApp number." });
    setBusy(true);
    setMsg(null);
    if (!(await loadCheckout())) return fail("Couldn't load the payment window.");
    const { ok, data: order } = await post("/api/guest-order", { phone: mobile, coupon: coupon?.code });
    if (!ok) return fail(order.error || "Couldn't start the payment.");
    let failedReason = null;
    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Beyond Tatva",
      description: "AI course: full access",
      image: `${window.location.origin}/brand/mark.png`,
      prefill: { contact: `+91${mobile}` },
      theme: { color: "#2563eb" },
      handler: async (resp) => {
        setMsg({ tone: "info", text: "Payment received. Saving it…" });
        const { ok: saved, data } = await post("/api/guest-verify", resp);
        // Even when saving is delayed the webhook records it, so the next step is the same.
        if (saved || data.paid) {
          setBusy(false);
          setMsg(data.delayed ? { tone: "info", text: data.error, paymentId: resp.razorpay_payment_id } : null);
          return setPaid({ phone: data.phone || mobile, paymentId: resp.razorpay_payment_id });
        }
        fail(`${data.error || "We couldn't confirm the payment."} Don't worry, message us and we'll sort it out.`, resp.razorpay_payment_id);
      },
      modal: {
        ondismiss: () => {
          if (failedReason) return fail(`Payment failed: ${failedReason}. If money was deducted, it comes back automatically.`);
          setBusy(false);
          setMsg({ tone: "info", text: "Payment cancelled. No money was taken." });
        },
      },
    });
    rzp.on("payment.failed", (resp) => { failedReason = resp.error?.description || "please try again"; });
    rzp.open();
  }

  if (paid) {
    const next = `/login?phone=${paid.phone}&next=${encodeURIComponent("/course")}`;
    return (
      <div className="mt-5">
        <p className="flex items-center gap-2 text-lg font-semibold text-success"><CheckCircle2 className="h-5 w-5" /> Payment done!</p>
        <p className="mt-1 text-xs text-muted">Payment ID: {paid.paymentId}</p>
        <ol className="mt-4 space-y-2 text-sm">
          <li><b>1.</b> Confirm <b>{paid.phone}</b> with a WhatsApp code.</li>
          <li><b>2.</b> Fill in the student&apos;s details.</li>
          <li><b>3.</b> The course opens.</li>
        </ol>
        <a href={next} className="btn-primary mt-4 w-full">Continue</a>
        <p className="mt-2 text-xs text-muted">Always sign in with this number: your payment is saved on it.</p>
        {msg && <p role="status" className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted">{msg.text}</p>}
        {waLink(paid.paymentId) && <a href={waLink(paid.paymentId)} target="_blank" rel="noopener" className="btn-secondary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Need help? WhatsApp us</a>}
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="mt-4 rounded-xl bg-surface-2 p-4 text-sm">
        <p>Online payment is coming soon. Message us on WhatsApp and we&apos;ll help you.</p>
        {waLink() && <a href={waLink()} target="_blank" rel="noopener" className="btn-primary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Message us on WhatsApp</a>}
      </div>
    );
  }

  const off = coupon ? price - coupon.price : 0;
  return (
    <>
      <section className="mt-5 rounded-xl border border-border p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Order summary</h2>
        <div className="mt-3 flex items-start justify-between gap-3 text-sm">
          <div><p className="font-semibold">{title}</p><p className="text-xs text-muted">Full course · one-time payment</p></div>
          <span className="font-semibold">₹{price}</span>
        </div>
        {coupon && (
          <div className="mt-2 flex items-center justify-between text-sm text-success">
            <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Coupon {coupon.code}
              <button type="button" onClick={() => { setCoupon(null); setCode(""); }} className="text-xs text-muted underline">Remove</button></span>
            <span>−₹{off}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold">Total <span className="text-xs font-normal text-muted">(incl. GST)</span></span>
          <span className="text-xl font-bold">₹{amount}</span>
        </div>
      </section>

      {!coupon && (
        <form onSubmit={applyCoupon} className="mt-3 flex gap-2">
          <input className="input min-w-0 flex-1 uppercase placeholder:normal-case" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" autoComplete="off" aria-label="Coupon code" />
          <button className="btn-secondary">Apply</button>
        </form>
      )}
      {couponError && <p role="alert" className="mt-2 text-sm text-danger">{couponError}</p>}

      <label className="mt-5 block">
        <span className="label">WhatsApp number</span>
        <div className="relative">
          <img src="/pay/whatsapp.svg" alt="" className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2" />
          <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-lg text-muted">+91</span>
          <input className="input !pl-[5.25rem] text-lg" type="tel" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" autoComplete="tel-national" required />
        </div>
        <span className="mt-1 block text-xs text-muted">Your login and course updates come on this number.</span>
      </label>

      <button onClick={pay} disabled={busy} className="btn-primary mt-4 w-full !py-3 text-base">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {busy ? "Opening payment…" : `Pay ₹${amount}`}</button>
      {msg && (
        <div role={msg.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm ${msg.tone === "error" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
          <p>{msg.text}{msg.paymentId && <> Payment ID: <b>{msg.paymentId}</b></>}</p>
          {msg.tone === "error" && waLink(msg.paymentId) && <a href={waLink(msg.paymentId)} target="_blank" rel="noopener" className="btn-secondary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Get help on WhatsApp</a>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pay with UPI, Google Pay, PhonePe, Paytm, Visa or Mastercard">
        {[["upi", "UPI", "w-10"], ["googlepay", "Google Pay"], ["phonepe", "PhonePe"], ["paytm", "Paytm"], ["visa", "Visa"], ["mastercard", "Mastercard"]].map(([f, alt, w]) => (
          <span key={f} className="grid h-9 place-items-center rounded-lg border border-border bg-white px-2"><img src={`/pay/${f}.svg`} alt={alt} className={`h-5 ${w || "w-5"}`} /></span>
        ))}
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> 100% secure payment by Razorpay</p>
    </>
  );
}
