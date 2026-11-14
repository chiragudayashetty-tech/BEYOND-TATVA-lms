"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

// Student asks for a WhatsApp code to their parent's number, the parent reads it out, the student types it.
export default function ParentConfirm({ verified = false, wording = "" }) {
  const router = useRouter();
  const [sentTo, setSentTo] = useState(""); const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(verified);

  async function call(body) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/parent-consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(data.error ?? "Please try again."); return null; }
      return data;
    } catch { setError("No internet. Please try again."); return null; } finally { setBusy(false); }
  }

  if (done) return <div className="flex items-center gap-1.5 text-xs text-success"><ShieldCheck className="h-3.5 w-3.5" />Parent confirmed on WhatsApp</div>;
  return (
    <div className="mt-3 space-y-2 text-xs">
      <p className="text-muted">Ask your parent to confirm. We send a 6-digit code to their WhatsApp; they read it out to you.</p>
      {wording && <details className="text-muted"><summary className="cursor-pointer">What your parent agrees to</summary><p className="mt-1">{wording}</p></details>}
      {!sentTo ? (
        <button type="button" disabled={busy} className="btn-secondary w-full py-2" onClick={async () => { const d = await call({ action: "send" }); if (d) setSentTo(d.sent_to); }}>
          {busy ? "Sending…" : "Send code to my parent"}
        </button>
      ) : (
        <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await call({ action: "verify", code })) { setDone(true); router.refresh(); } }}>
          <label className="sr-only" htmlFor="parent-code">Code sent to {sentTo}</label>
          <input id="parent-code" className="input flex-1" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={`Code sent to ${sentTo}`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button disabled={busy || code.length !== 6} className="btn-primary px-4">{busy ? "…" : "Confirm"}</button>
        </form>
      )}
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
