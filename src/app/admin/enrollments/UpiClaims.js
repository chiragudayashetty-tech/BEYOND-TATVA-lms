"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const when = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// UPI payments waiting for Chirag: open the screenshot, match it in the bank app, then approve or reject.
export default function UpiClaims({ claims }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  async function decide(c, approve) {
    setBusy(c.id); setError("");
    const { error: rpcError } = await createClient().rpc("admin_decide_upi_claim", { p_claim: c.id, p_approve: approve, p_note: null });
    setBusy(null);
    if (rpcError) return setError(rpcError.message);
    router.refresh();
  }
  if (!claims.length) return <p className="text-sm text-muted">No UPI payments waiting. New ones appear here as parents upload their screenshot.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Open each screenshot, find the same amount and time (or UTR) in your bank app, then approve. Approving unlocks the course and records the payment.</p>
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <ul className="space-y-2">
        {claims.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="min-w-0 flex-1 basis-56 text-sm">
              <div className="font-semibold">{c.student} <span className="font-normal text-muted">· ₹{c.amount_paise / 100}{c.coupon_code ? ` with ${c.coupon_code}` : ""}</span></div>
              <div className="text-xs text-muted">{when(c.created_at)} · parent {c.phone || "–"}{c.payer_name ? ` · paid by ${c.payer_name}` : ""}{c.utr ? ` · UTR ${c.utr}` : ""}</div>
            </div>
            {c.proof && <a href={c.proof} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 px-3 text-sm"><ExternalLink className="h-4 w-4" /> Screenshot</a>}
            <button type="button" disabled={busy === c.id} onClick={() => decide(c, true)} className="btn-primary min-h-11 px-3 text-sm"><Check className="h-4 w-4" /> Approve</button>
            <button type="button" disabled={busy === c.id} onClick={() => decide(c, false)} className="btn-ghost min-h-11 px-3 text-sm text-danger"><X className="h-4 w-4" /> Reject</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
