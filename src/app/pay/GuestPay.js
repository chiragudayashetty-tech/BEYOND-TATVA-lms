"use client";

import { useState } from "react";
import PriceTag from "@/components/PriceTag";
import { Check, CheckCircle2, CreditCard, Loader2, MessageCircle, ShieldCheck, Tag } from "lucide-react";
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

export default function GuestPay({ price, listPrice, enabled, whatsapp }) {
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, price }
  const [couponError, setCouponError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text, paymentId? }
  const [paid, setPaid] = useState(null); // { phone, paymentId }
  const amount = coupon?.price ?? price;

  const waLink = (paymentId) => whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(paymentId ? `Hi! I paid for the Beyond Tatva course. Payment ID: ${paymentId}` : "Hi! I want to pay for the Beyond Tatva AI course.")}`
    : null;
  const fail = (text, paymentId) => { setBusy(false); setMsg({ tone: "error", text, paymentId }); };

  async function applyCoupon(e) {
    e.preventDefault();
    setCouponError("");
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { ok, data } = await post("/api/guest-order", { coupon: c, preview: true });
    if (!ok || !Number.isInteger(data.amount)) return setCouponError("That coupon code is not valid or has expired.");
    setCoupon({ code: c, price: data.amount / 100 });
  }

  async function pay() {
    if (isInApp()) return;
    if (!/^[6-9]\d{9}$/.test(mobile)) return setMsg({ tone: "error", text: "Enter a parent's 10-digit mobile number." });
    setBusy(true);
    setMsg(null);
    if (!(await loadCheckout())) return fail("Couldn't load the payment window.");
    const { ok, data: order } = await post("/api/guest-order", { coupon: coupon?.code, phone: mobile });
    if (!ok) return fail(order.error || "Couldn't start the payment.");
    let failedReason = null;
    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Beyond Tatva",
      description: "AI course: full access",
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

  return (
    <>
      <div className="mt-5">
        <PriceTag key={amount} price={amount} listPrice={coupon ? price : listPrice} className="!justify-start" />
        <span className="text-sm text-muted">one time · incl. GST{coupon && ` · coupon ${coupon.code}`}</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {["Every paid module and its lessons", "Quizzes, assignments and feedback", "Certificate at the end"].map((t) => (
          <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
        ))}
      </ul>
      <label className="mt-5 block">
        <span className="label">Parent&apos;s WhatsApp number</span>
        <input className="input text-lg" type="tel" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98450 12345" autoComplete="tel-national" required />
      </label>
      <p className="mt-1 text-xs text-muted">You&apos;ll sign in with this number after paying.</p>
      {coupon ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-success">
          <Tag className="h-4 w-4" /> Coupon <b>{coupon.code}</b> applied.
          <button type="button" onClick={() => { setCoupon(null); setCode(""); }} className="ml-auto text-muted underline">Remove</button>
        </p>
      ) : (
        <form onSubmit={applyCoupon} className="mt-4 flex gap-2">
          <input className="input flex-1 uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code (optional)" autoComplete="off" aria-label="Coupon code" />
          <button className="btn-secondary">Apply</button>
        </form>
      )}
      {couponError && <p role="alert" className="mt-2 text-sm text-danger">{couponError}</p>}
      <button onClick={pay} disabled={busy} className="btn-primary mt-4 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {busy ? "Opening payment…" : `Pay ₹${amount}`}</button>
      {msg && (
        <div role={msg.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm ${msg.tone === "error" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
          <p>{msg.text}{msg.paymentId && <> Payment ID: <b>{msg.paymentId}</b></>}</p>
          {msg.tone === "error" && waLink(msg.paymentId) && <a href={waLink(msg.paymentId)} target="_blank" rel="noopener" className="btn-secondary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Get help on WhatsApp</a>}
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout by Razorpay: UPI, cards and netbanking.</p>
    </>
  );
}
