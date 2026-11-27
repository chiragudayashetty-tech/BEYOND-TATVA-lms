"use client";

import { useState } from "react";
import PriceTag from "@/components/PriceTag";
import { CheckCircle2, CreditCard, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text, paymentId? }
  const [paid, setPaid] = useState(null); // { phone, paymentId }

  const waLink = (paymentId) => whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(paymentId ? `Hi! I paid for the Beyond Tatva course. Payment ID: ${paymentId}` : "Hi! I want to pay for the Beyond Tatva AI course.")}`
    : null;
  const fail = (text, paymentId) => { setBusy(false); setMsg({ tone: "error", text, paymentId }); };

  async function pay() {
    if (isInApp()) return;
    if (!/^[6-9]\d{9}$/.test(mobile)) return setMsg({ tone: "error", text: "Enter your 10-digit WhatsApp number." });
    setBusy(true);
    setMsg(null);
    if (!(await loadCheckout())) return fail("Couldn't load the payment window.");
    const { ok, data: order } = await post("/api/guest-order", { phone: mobile });
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
        <PriceTag price={price} listPrice={listPrice} className="!justify-start" />
        <span className="text-sm text-muted">one time · incl. GST</span>
      </div>
      <label className="mt-5 block">
        <span className="label">Enter your WhatsApp number</span>
        <div className="relative">
          <WhatsAppLogo className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2" />
          <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-lg text-muted">+91</span>
          <input className="input !pl-[5.25rem] text-lg" type="tel" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98450 12345" autoComplete="tel-national" autoFocus required />
        </div>
      </label>
      <button onClick={pay} disabled={busy} className="btn-primary mt-4 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {busy ? "Opening payment…" : `Pay ₹${price}`}</button>
      {msg && (
        <div role={msg.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm ${msg.tone === "error" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
          <p>{msg.text}{msg.paymentId && <> Payment ID: <b>{msg.paymentId}</b></>}</p>
          {msg.tone === "error" && waLink(msg.paymentId) && <a href={waLink(msg.paymentId)} target="_blank" rel="noopener" className="btn-secondary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Get help on WhatsApp</a>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Pay with UPI, Google Pay, PhonePe, Paytm, cards or netbanking">
        {["UPI", "Google Pay", "PhonePe", "Paytm", "Cards", "Netbanking"].map((m) => (
          <span key={m} className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-semibold text-muted">{m}</span>
        ))}
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout by Razorpay</p>
    </>
  );
}

function WhatsAppLogo({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
      <path fill="#fff" d="M17.3 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z" />
    </svg>
  );
}
