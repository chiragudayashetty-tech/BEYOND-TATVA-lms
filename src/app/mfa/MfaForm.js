"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// First time: scan a QR code into an authenticator app and type the code (enrols the app).
// After that: just type the current code. Either way the login becomes "aal2", which Studio needs.
export default function MfaForm({ next = "/admin" }) {
  const [state, setState] = useState({ step: "loading" });
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) return setState({ step: "error", message: "Couldn't load your login settings. Refresh the page." });
      const ready = data?.totp?.find((f) => f.status === "verified");
      if (ready) return setState({ step: "verify", factorId: ready.id });
      // Clear half-finished setups so a fresh QR code can be made.
      for (const f of data?.all ?? []) if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Studio ${new Date().toISOString().slice(0, 10)}` });
      if (enrollError) return setState({ step: "error", message: "Two-step login isn't switched on in Supabase yet (Authentication → Multi-Factor → TOTP)." });
      setState({ step: "enroll", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
    })();
  }, []);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId: state.factorId, code });
    if (verifyError) { setBusy(false); setError("That code didn't work. Check the time on your phone and try the newest code."); return; }
    window.location.assign(next);  // full load so the server sees the upgraded login
  }

  if (state.step === "loading") return <div className="card p-6 text-center text-sm text-muted">Loading…</div>;
  if (state.step === "error") return <div className="card p-6 text-sm text-danger">{state.message}</div>;
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <h1 className="text-xl font-semibold">Two-step login</h1>
      {state.step === "enroll" ? (
        <>
          <p className="text-sm text-muted">Studio holds students&apos; data, so it needs a second step. Scan this with Google Authenticator, Microsoft Authenticator or Authy, then type the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qr} alt="QR code for your authenticator app" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />
          <p className="break-all text-center text-xs text-muted">Can&apos;t scan? Enter this key: <span className="font-mono">{state.secret}</span></p>
        </>
      ) : (
        <p className="text-sm text-muted">Type the 6-digit code from your authenticator app.</p>
      )}
      <div>
        <label className="label" htmlFor="mfa-code">Code</label>
        <input id="mfa-code" className="input w-full text-center font-mono text-lg tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={busy || code.length !== 6} className="btn-primary w-full py-3">{busy ? "Checking…" : "Confirm"}</button>
      <p className="text-xs text-muted">Lost your phone? Another Studio admin can reset it in Supabase (Authentication → Users → MFA factors).</p>
    </form>
  );
}
