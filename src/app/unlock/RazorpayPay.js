"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Razorpay Standard Checkout: create order on our server → Razorpay modal → our server checks the
// signature and unlocks. If anything fails, the student gets a WhatsApp button to reach us.
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

export default function RazorpayPay({ price, enabled, name, email, phone, whatsapp }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone: "error" | "info", text, paymentId? }
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, price }
  const [couponError, setCouponError] = useState("");
  const [mobile, setMobile] = useState((phone || "").replace(/\D/g, "").slice(-10));
  const amount = coupon?.price ?? price;

  const waLink = (paymentId) => whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(paymentId ? `Hi! My course payment needs help. Payment ID: ${paymentId}` : `Hi! I want to unlock the Beyond Tatva course but the online payment isn't working.`)}`
    : null;

  async function applyCoupon(e) {
    e.preventDefault();
    setCouponError("");
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data, error } = await createClient().rpc("coupon_price", { p_code: c });
    if (error || !Number.isInteger(data)) return setCouponError("That coupon code is not valid or has expired.");
    setCoupon({ code: c, price: data });
  }

  const fail = (text, paymentId) => { setBusy(false); setMsg({ tone: "error", text, paymentId }); };

  async function pay() {
    if (!/^[6-9]\d{9}$/.test(mobile)) return setMsg({ tone: "error", text: "Enter a parent's 10-digit mobile number to continue." });
    setBusy(true);
    setMsg(null);
    if (!(await loadCheckout())) return fail("Couldn't load the payment window.");
    const { ok, data: order } = await post("/api/create-order", { coupon: coupon?.code, phone: mobile });
    if (!ok) return fail(order.error || "Couldn't start the payment.");

    let failedReason = null;
    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Beyond Tatva",
      description: "AI course: full access",
      prefill: { name: name || "", email: email || "", contact: `+91${mobile}` },
      theme: { color: "#2563eb" },
      handler: async (resp) => {
        setMsg({ tone: "info", text: "Payment received. Unlocking your course…" });
        const { ok: verified, data } = await post("/api/verify-payment", resp);
        if (verified && data.unlocked) { setBusy(false); return router.refresh(); }
        if (verified && data.paid && data.next) {
          setMsg({ tone: "info", text: "Payment done! Now one minute of details and your course opens." });
          return router.replace(data.next);
        }
        fail(`${data.error || "We couldn't confirm the payment."} Don't worry, message us and we'll unlock it.`, resp.razorpay_payment_id);
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

  if (!enabled) {
    return (
      <div className="mt-4 rounded-xl bg-surface-2 p-4 text-sm">
        <p>Online payment is coming soon. Message us on WhatsApp and we&apos;ll help you unlock the course.</p>
        {waLink() && <a href={waLink()} target="_blank" rel="noopener" className="btn-primary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Message us on WhatsApp</a>}
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 flex items-baseline gap-1.5">
        {coupon && <span className="text-lg text-muted line-through">₹{price}</span>}
        <span className="font-display text-4xl font-semibold">₹{amount}</span>
        <span className="text-sm text-muted">one time · incl. GST</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {["Every paid module and its lessons", "Quizzes, assignments and feedback", "Certificate at the end"].map((t) => (
          <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
        ))}
      </ul>

      {coupon ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-success">
          <Tag className="h-4 w-4" /> Coupon <b>{coupon.code}</b> applied.
          <button type="button" onClick={() => { setCoupon(null); setCode(""); }} className="ml-auto text-muted underline">Remove</button>
        </p>
      ) : (
        <form onSubmit={applyCoupon} className="mt-4 flex gap-2">
          <input className="input flex-1 uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" autoComplete="off" aria-label="Coupon code" />
          <button className="btn-secondary">Apply</button>
        </form>
      )}
      {couponError && <p role="alert" className="mt-2 text-sm text-danger">{couponError}</p>}

      <label className="mt-4 block">
        <span className="label">Parent&apos;s mobile number</span>
        <input className="input" type="tel" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98450 12345" autoComplete="tel-national" required />
      </label>
      <button onClick={pay} disabled={busy} className="btn-primary mt-4 w-full"><CreditCard className="h-4 w-4" /> {busy ? "Opening payment…" : `Pay ₹${amount} and unlock`}</button>

      {msg && (
        <div role={msg.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm ${msg.tone === "error" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
          <p>{msg.text}{msg.paymentId && <> Payment ID: <b>{msg.paymentId}</b></>}</p>
          {msg.tone === "error" && waLink(msg.paymentId) && (
            <a href={waLink(msg.paymentId)} target="_blank" rel="noopener" className="btn-secondary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Get help on WhatsApp</a>
          )}
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout by Razorpay: UPI, cards and netbanking. Ask a parent before paying.</p>
    </>
  );
}
