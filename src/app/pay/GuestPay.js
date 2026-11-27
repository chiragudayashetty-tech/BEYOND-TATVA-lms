"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
        const { ok: saved, data } = await post("/api/guest-verify", resp);
        // Even when saving is delayed the webhook records it, so the next step is the same.
        if (saved || data.paid) {
          const q = new URLSearchParams({ paid: data.phone || mobile, id: resp.razorpay_payment_id });
          if (data.claim) q.set("c", data.claim);
          if (data.delayed) q.set("delayed", "1");
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

// After paying: the WhatsApp code goes to the number they paid with, typed right here. "Change number" signs in
// with another number and moves the waiting payment to it (/api/guest-claim, needs this browser's claim token).
// Then the sign-up box (/onboarding), or straight to the course for a number that already has an account.
function PaidVerify({ paid, help }) {
  const [phone, setPhone] = useState(paid.phone);
  const [editing, setEditing] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const auto = useRef(false);
  const [skip, setSkip] = useState(false); // "Code not coming?" → choose a password instead
  const [pw, setPw] = useState("");
  const [signin, setSignin] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function send(to = phone) {
    if (!/^[6-9]\d{9}$/.test(to)) return setError("Enter a 10-digit WhatsApp number.");
    setBusy(true);
    setError("");
    await fetch("/api/auth/phone-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: `91${to}` }) }).catch(() => {});
    const { error } = await createClient().auth.signInWithOtp({ phone: `+91${to}`, options: { shouldCreateUser: true, channel: "sms" } });
    setBusy(false);
    setWait(60);
    if (error) return setError(/rate|seconds|too many/i.test(error.message) ? "Please wait a minute before asking for another code." : "Couldn't send the code. Check the number is on WhatsApp and try again.");
    // Remember the send only once it really worked, so a reload (common after a UPI app) sends again if it never did.
    try { sessionStorage.setItem(`bt_pay_code_${paid.paymentId}`, String(Date.now())); } catch {}
    setSent(true);
    setEditing(false);
    setCode("");
  }

  // Send the code once, as soon as the payment is done (not again on every reload).
  useEffect(() => {
    if (auto.current) return;
    auto.current = true;
    // A code sent less than 10 minutes ago is still valid: don't send another, just keep the resend timer.
    let ago = Infinity;
    try { ago = (Date.now() - Number(sessionStorage.getItem(`bt_pay_code_${paid.paymentId}`) || 0)) / 1000; } catch {}
    const t = window.setTimeout(() => {
      if (ago < 600) { setSent(true); setWait(Math.max(0, Math.ceil(60 - ago))); }
      else send(paid.phone);
    }, 0);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify(token) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/phone-accounts", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "verify", phone: `91${phone}`, token }) }).then((x) => x.json()).catch(() => ({ error: "Couldn't check the code. Try again." }));
    if (res.error) { setBusy(false); return setError(/expired|invalid/i.test(res.error) ? "That code is wrong or expired. Check WhatsApp, or send a new one." : res.error); }
    await fetch("/api/auth/settle", { method: "POST" }).catch(() => {});
    if (phone !== paid.phone && paid.claim) {
      await fetch("/api/guest-claim", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ payment_id: paid.paymentId, claim: paid.claim }) }).catch(() => {});
    }
    try { sessionStorage.removeItem("bt_pay_phone"); } catch {}
    await createClient().rpc("claim_purchases");
    // Several accounts on one number ("Which student?") are handled on the login page.
    const many = await fetch("/api/auth/phone-accounts").then((x) => (x.ok ? x.json() : null)).catch(() => null);
    window.location.replace(many?.accounts?.length > 1 ? "/login?next=%2Fcourse" : "/onboarding?next=%2Fcourse");
  }

  // Skip the code: the paying browser's claim token proves the payment (/api/guest-session). New numbers only.
  async function skipCode(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { ok, data } = await post("/api/guest-session", { payment_id: paid.paymentId, claim: paid.claim, password: pw });
    if (!ok) { setBusy(false); setSignin(Boolean(data.signin)); return setError(data.error || "Couldn't continue. Message us and we'll unlock it."); }
    try { sessionStorage.removeItem("bt_pay_phone"); } catch {}
    await createClient().rpc("claim_purchases");
    window.location.replace("/onboarding?next=%2Fcourse");
  }

  function onCode(v) {
    const d = v.replace(/\D/g, "").slice(0, 6);
    setCode(d);
    if (d.length === 6 && !busy) verify(d);
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 rounded-xl bg-success-soft p-3">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
        <div><p className="font-semibold text-success">Payment done!</p><p className="text-xs text-muted">Payment ID: {paid.paymentId}</p></div>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {["Pay", "Code", "Details"].map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i === 0 ? "bg-success" : i === 1 ? "bg-primary" : "bg-border"}`} />)}
      </div>
      <p className="mt-1 text-xs text-muted">Step 2 of 3 · verify your number</p>

      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); send(phone); }} className="mt-4">
          <span className="label">New WhatsApp number</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <img src="/pay/whatsapp.svg" alt="" className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2" />
              <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-lg text-muted">+91</span>
              <input className="input !pl-[5.25rem] text-lg" type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" autoFocus />
            </div>
          </div>
          <button disabled={busy || wait > 0} className="btn-primary mt-3 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{wait > 0 ? `Send code in ${wait}s` : "Send code"}</button>
          <p className="mt-2 text-xs text-muted">Your payment moves to this number. Always sign in with it.</p>
        </form>
      ) : (
        <div className="mt-4">
          <p className="text-sm">{sent ? <>We sent a 6-digit code on WhatsApp to</> : <>Sending a code on WhatsApp to</>} <b>+91 {phone}</b>
            <button type="button" onClick={() => { setEditing(true); setError(""); setWait(0); setPhone(""); }} className="ml-2 font-semibold text-primary underline">Change number</button></p>
          <input className="input mt-3 text-center text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => onCode(e.target.value)} placeholder="••••••" aria-label="6-digit code" autoFocus disabled={busy} />
          <button type="button" disabled={busy || code.length < 6} onClick={() => verify(code)} className="btn-primary mt-3 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify and continue</button>
          <button type="button" disabled={busy || wait > 0} onClick={() => send(phone)} className="mt-2 w-full py-2 text-sm text-muted underline disabled:no-underline">{wait > 0 ? `Resend code in ${wait}s` : "Resend code"}</button>
          {sent && <p className="mt-1 text-center text-xs text-muted">No code? Check WhatsApp (not SMS) on this number.</p>}
          {paid.claim && phone === paid.phone && (skip ? (
            <form onSubmit={skipCode} className="mt-4 rounded-xl border border-border p-3">
              <p className="text-sm font-semibold">Skip the code: choose a password</p>
              <input className="input mt-2" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 letters and numbers" aria-label="New password" required />
              <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs">
                <b>Save this.</b> To sign in again later, open <b>learn.beyondtatva.in/login</b>, type <b>{phone}</b> and this password. (The WhatsApp code works too, once it arrives.)
              </p>
              <button disabled={busy || pw.length < 8} className="btn-primary mt-3 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue without code</button>
            </form>
          ) : (
            <button type="button" onClick={() => { setSkip(true); setError(""); }} className="mt-3 w-full rounded-xl bg-surface-2 py-3 text-sm font-semibold">Code not coming? Skip it</button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {signin && <a href={`/login?phone=${phone}&next=%2Fcourse`} className="btn-primary mt-3 w-full">Sign in and open the course</a>}
      {help && <a href={help} target="_blank" rel="noopener" className="btn-secondary mt-4 w-full"><MessageCircle className="h-4 w-4" /> Need help? WhatsApp us</a>}
    </div>
  );
}
