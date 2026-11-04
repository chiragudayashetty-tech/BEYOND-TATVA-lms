"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Copy, Smartphone, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Interim payment until Razorpay: pay by UPI to Beyond Tatva, then upload the payment screenshot (UTR optional).
// Chirag checks it against the bank app in Studio → Enrollments and approves; the course then unlocks.
export default function UpiPay({ price, upiId, payee, note, pending, userId }) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [proof, setProof] = useState(null);
  const [payer, setPayer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(Boolean(pending));
  const [copied, setCopied] = useState(false);
  const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${price}&cu=INR&tn=${encodeURIComponent(note)}`;

  async function copy() {
    try { await navigator.clipboard.writeText(upiId); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the ID is shown as text to copy by hand */ }
  }

  async function submit(e) {
    e.preventDefault(); setError("");
    if (!proof) return setError("Please add the payment screenshot.");
    if (proof.size > 5 * 1024 * 1024) return setError("That screenshot is over 5 MB. Try a normal screenshot instead of a photo.");
    setBusy(true);
    const supabase = createClient();
    const ext = (proof.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proof, { contentType: proof.type || undefined, upsert: false });
    if (upErr) { setBusy(false); return setError(/mime|type/i.test(upErr.message) ? "Please upload a photo (JPG, PNG, HEIC) or PDF." : "Upload failed. Check your internet and try again."); }
    const { data, error: rpcError } = await supabase.rpc("submit_upi_claim", { p_proof: path, p_utr: utr || null, p_payer_name: payer });
    setBusy(false);
    if (rpcError) return setError(rpcError.message);
    if (data === "already_unlocked") return router.refresh();
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="mt-5 rounded-2xl bg-warning-soft p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" /> Payment received for checking</p>
        <p className="mt-1 text-muted">We match your UPI reference with our bank and unlock the course, usually within a few hours. Come back to this page or the dashboard to see it unlocked.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-baseline gap-1.5"><span className="font-display text-4xl font-semibold">₹{price}</span><span className="text-sm text-muted">one time</span></div>
      <ol className="space-y-3 text-sm">
        <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">1</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Pay ₹{price} by UPI</p>
            <a href={link} className="btn-primary mt-2 w-full sm:hidden"><Smartphone className="h-4 w-4" /> Pay with a UPI app</a>
            <p className="mt-2 text-muted">Or pay from any UPI app to:</p>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-surface-2 p-2 pl-3">
              <span className="min-w-0 flex-1 select-all break-all font-mono text-sm font-semibold">{upiId}</span>
              <button type="button" onClick={copy} className="btn-ghost min-h-11 px-3" aria-label="Copy UPI ID">{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}</button>
            </div>
            <p className="mt-1 text-xs text-muted">Name shown: {payee}</p>
          </div>
        </li>
        <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">2</span>
          <form onSubmit={submit} className="min-w-0 flex-1 space-y-2">
            <p className="font-semibold">Upload the payment screenshot</p>
            <p className="text-muted">Take a screenshot of the &quot;Payment successful&quot; screen in your UPI app.</p>
            <label className="btn-secondary w-full cursor-pointer"><Upload className="h-4 w-4" /> {proof ? "Change screenshot" : "Choose screenshot"}
              <input id="proof" type="file" accept="image/*,application/pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="sr-only" /></label>
            {proof && <p className="truncate text-xs text-success">Added: {proof.name}</p>}
            <input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="12-digit UPI reference (optional)" aria-label="UPI reference number, optional" className="input font-mono tracking-wider" />
            <input id="payer" value={payer} onChange={(e) => setPayer(e.target.value)} maxLength={80} placeholder="Name on the paying account (optional)" aria-label="Name on the paying account" className="input" />
            {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-danger">{error}</p>}
            <button disabled={busy} className="btn-primary w-full">{busy ? "Uploading…" : "I've paid: unlock my course"}</button>
          </form>
        </li>
      </ol>
    </div>
  );
}
