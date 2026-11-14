"use client";

import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Profile → Login and security: set a password (for phone + password sign-in) and add a recovery email.
export default function LoginSettings({ email, phone, reset = false }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [mail, setMail] = useState("");
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState("");

  async function savePassword(e) {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ pw: ["err", "Use at least 8 characters."] });
    if (pw !== pw2) return setMsg({ pw: ["err", "The two passwords don't match."] });
    setBusy("pw");
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy("");
    if (error) return setMsg({ pw: ["err", /reauth|recent/i.test(error.message) ? "For safety, sign out and sign in again with a WhatsApp code, then set the password." : error.message] });
    setPw(""); setPw2("");
    setMsg({ pw: ["ok", phone ? `Password saved. You can now sign in with ${phone} and this password.` : "Password saved."] });
  }

  async function saveEmail(e) {
    e.preventDefault();
    setBusy("mail");
    const { error } = await createClient().auth.updateUser({ email: mail.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fprofile%23login` });
    setBusy("");
    if (error) return setMsg({ mail: ["err", /already/i.test(error.message) ? "That email is already on another account." : error.message] });
    setMsg({ mail: ["ok", "Check that inbox and tap the link to confirm. Then you can reset your password by email."] });
  }

  const note = (k) => msg[k] && <p role={msg[k][0] === "err" ? "alert" : "status"} className={`rounded-xl p-2.5 text-sm ${msg[k][0] === "err" ? "bg-danger-soft text-danger" : "bg-success-soft"}`}>{msg[k][1]}</p>;

  return (
    <div id="login" className="scroll-mt-24 space-y-5 px-5 py-4">
      <div className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4 text-muted" /> Login and security</div>
      <p className="text-xs text-muted">Signed in with {[email, phone].filter(Boolean).join(" · ") || "Google"}.</p>
      <form onSubmit={savePassword} className="space-y-2">
        <span className="label">{reset ? "Set your new password" : "Password"}{phone ? " (for phone sign-in)" : ""}</span>
        <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (8+ characters)" autoFocus={reset} />
        <input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" />
        <button disabled={busy === "pw" || !pw} className="btn-secondary w-full sm:w-auto">{busy === "pw" ? "Saving…" : "Save password"}</button>
        {note("pw")}
      </form>
      {!email && (
        <form onSubmit={saveEmail} className="space-y-2">
          <span className="label flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Recovery email</span>
          <p className="text-xs text-muted">Lets you reset your password if you forget it. A parent&apos;s email is fine.</p>
          <input className="input" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="you@example.com" required />
          <button disabled={busy === "mail"} className="btn-secondary w-full sm:w-auto">{busy === "mail" ? "Sending…" : "Add email"}</button>
          {note("mail")}
        </form>
      )}
    </div>
  );
}
