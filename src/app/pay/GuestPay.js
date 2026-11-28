"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Lock, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { isInApp } from "@/lib/android-app";
import PayLogos from "@/components/PayLogos";

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

export default function GuestPay({ title, price, enabled, whatsapp, paidPhone, paidId, paidClaim }) {
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, price }
  const [couponError, setCouponError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text, paymentId? }
  // After paying we load a fresh /pay?paid=… page (iPhone Safari could crash re-rendering under the Razorpay window).
  const [paid] = useState(paidPhone ? { phone: paidPhone, paymentId: paidId, claim: paidClaim } : null);
  // The tab may also reload while the parent is in the UPI app: offer "already paid?" for that number.
  const [lastPhone, setLastPhone] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (paidPhone) sessionStorage.removeItem("bt_pay_phone");
        else setLastPhone(sessionStorage.getItem("bt_pay_phone") || "");
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, [paidPhone]);

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
    try { sessionStorage.setItem("bt_pay_phone", mobile); } catch {}
    if (!(await loadCheckout())) return fail("Couldn't load the payment window.");
    const { ok, data: order } = await post("/api/guest-order", { phone: mobile, coupon: coupon?.code });
    if (!ok && order.signin) { setBusy(false); return setMsg({ tone: "info", text: order.error, signin: order.signin }); }
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
        // Razorpay only calls this after a successful payment. The phone often has no signal for a moment when it
        // comes back from the UPI app, so retry; if it still fails, the Razorpay webhook records the payment on
        // this number anyway. Only a real "not valid" answer from our server is shown as an error.
        let res = { ok: false, data: {} };
        for (let i = 0; i < 4; i++) {
          res = await post("/api/guest-verify", resp);
          if (res.ok || res.data.paid || (res.data.error && res.data.error !== "No internet connection.")) break;
          await new Promise((r) => window.setTimeout(r, 1500 * (i + 1)));
        }
        const { ok: saved, data } = res;
        const offline = !saved && !data.paid && (!data.error || data.error === "No internet connection.");
        if (saved || data.paid || offline) {
          const q = new URLSearchParams({ paid: data.phone || mobile, id: resp.razorpay_payment_id });
          if (data.claim) q.set("c", data.claim);
          if (data.delayed || offline) q.set("delayed", "1");
          return window.location.replace(`/pay?${q}`);
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

  if (paid) return <PaidVerify paid={paid} help={waLink(paid.paymentId)} />;

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
      {lastPhone && (
        <a href={`/login?phone=${lastPhone}&next=${encodeURIComponent("/course")}`} className="mt-4 block rounded-xl bg-success-soft p-3 text-sm text-success">
          Already paid with <b>{lastPhone}</b>? <u>Continue to the course</u>
        </a>
      )}
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
      <p className="mt-2 text-center text-xs text-muted">By paying, the parent or guardian confirms they accept our <a href="/terms" target="_blank" rel="noopener" className="font-medium text-primary underline">Terms</a>, <a href="/privacy" target="_blank" rel="noopener" className="font-medium text-primary underline">Privacy policy</a> and <a href="/refund-policy" target="_blank" rel="noopener" className="font-medium text-primary underline">Refund policy</a>.</p>
      {msg && (
        <div role={msg.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm ${msg.tone === "error" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
          <p>{msg.text}{msg.paymentId && <> Payment ID: <b>{msg.paymentId}</b></>}</p>
          {msg.signin && <a href={msg.signin} className="btn-primary mt-3 w-full">Sign in and open the course</a>}
          {msg.tone === "error" && waLink(msg.paymentId) && <a href={waLink(msg.paymentId)} target="_blank" rel="noopener" className="btn-secondary mt-3 w-full"><MessageCircle className="h-4 w-4" /> Get help on WhatsApp</a>}
        </div>
      )}

      <PayLogos className="mt-5" />
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> 100% secure payment by Razorpay</p>
    </>
  );
}

// After paying on /pay: no WhatsApp code here. The payment is saved on the number they paid with (a waiting
// purchase). They sign up / sign in later through the normal /login flow with that number (WhatsApp code there),
// and claim_purchases unlocks the course for it.
function PaidVerify({ paid, help }) {
  const signin = `/login?phone=${paid.phone}&next=${encodeURIComponent("/course")}`;
  // Show "Payment done" for a moment, then take them to sign up with this number.
  useEffect(() => {
    const t = window.setTimeout(() => window.location.assign(signin), 4000);
    return () => window.clearTimeout(t);
  }, [signin]);
  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 rounded-xl bg-success-soft p-3">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
        <div><p className="font-semibold text-success">Payment done!</p><p className="text-xs text-muted">Payment ID: {paid.paymentId}</p></div>
      </div>
      <div className="mt-4 rounded-xl border border-border p-4 text-sm">
        <p>Your course is saved on this WhatsApp number:</p>
        <p className="mt-1 text-xl font-bold">+91 {paid.phone}</p>
        <p className="mt-3 text-muted">To open the course, sign up or sign in with <b>this same number</b>. The course unlocks by itself.</p>
      </div>
      <a href={signin} className="btn-primary mt-4 w-full !py-3 text-base">Sign up and open the course</a>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Taking you to sign up…</p>
      <p className="mt-2 text-center text-xs text-muted">Wrong number? Message us with your payment ID and we&apos;ll move it.</p>
      {help && <a href={help} target="_blank" rel="noopener" className="btn-secondary mt-4 w-full"><MessageCircle className="h-4 w-4" /> Need help? WhatsApp us</a>}
    </div>
  );
}
