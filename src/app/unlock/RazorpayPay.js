"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, ShieldCheck } from "lucide-react";

// Razorpay Standard Checkout inside the LMS: create order on our server → Razorpay modal →
// our server checks the signature and unlocks the course. The secret key never reaches the browser.
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
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

export default function RazorpayPay({ price, name, email, phone }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone: "error" | "info", text }

  async function pay() {
    setBusy(true);
    setMsg(null);
    if (!(await loadCheckout())) {
      setBusy(false);
      return setMsg({ tone: "error", text: "Couldn't load the payment window. Check your internet and try again." });
    }
    const { ok, data: order } = await post("/api/create-order");
    if (!ok) {
      setBusy(false);
      return setMsg({ tone: "error", text: order.error || "Couldn't start the payment. Please try again." });
    }

    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Beyond Tatva",
      description: "AI course: full access",
      prefill: { name: name || "", email: email || "", contact: phone || "" },
      theme: { color: "#2563eb" },
      handler: async (resp) => {
        setMsg({ tone: "info", text: "Payment received. Unlocking your course…" });
        const { ok: verified, data } = await post("/api/verify-payment", resp);
        setBusy(false);
        if (verified && data.unlocked) return router.refresh();
        setMsg({ tone: "error", text: `${data.error || "We couldn't confirm the payment."} Payment ID: ${resp.razorpay_payment_id}` });
      },
      modal: {
        ondismiss: () => {
          setBusy(false);
          setMsg((m) => m || { tone: "info", text: "Payment cancelled. You haven't been charged." });
        },
      },
    });
    rzp.on("payment.failed", (resp) => {
      setMsg({ tone: "error", text: `Payment failed: ${resp.error?.description || "please try again"}. If money was deducted, it is refunded automatically.` });
    });
    rzp.open();
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
      <button onClick={pay} disabled={busy} className="btn-primary mt-5 w-full"><CreditCard className="h-4 w-4" /> {busy ? "Opening payment…" : `Pay ₹${price} and unlock`}</button>
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm ${msg.tone === "error" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>{msg.text}</p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Secure checkout by Razorpay: UPI, cards and netbanking. Ask a parent before paying.</p>
    </>
  );
}
