"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { passwordProblem } from "@/lib/login-id";

// Set or change the password (Google / email-code users can add one too). Opened from the reset-password
// email link (/profile?password=new#password).
export default function PasswordCard({ loginWith, open: startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    const problem = passwordProblem(pw);
    if (problem) return setMsg({ bad: true, text: problem });
    if (pw !== pw2) return setMsg({ bad: true, text: "The two passwords don't match." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      const text = /different from the old/i.test(error.message) ? "That's already your password. Pick a new one."
        : /reauth|recent/i.test(error.message) ? "For safety, log out and sign in again, then change it."
        : "Couldn't save. Try again.";
      return setMsg({ bad: true, text });
    }
    setPw(""); setPw2(""); setOpen(false);
    setMsg({ bad: false, text: `Password saved. Next time sign in with ${loginWith} and this password.` });
  }

  return (
    <div id="password" className="px-5 py-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-11 w-full items-center gap-4 text-left">
        <KeyRound className="h-5 w-5 text-muted" strokeWidth={1.75} />
        <div className="flex-1">
          <div className="text-sm font-medium">Password</div>
          <div className="text-xs text-muted">You sign in with {loginWith}. Set or change your password.</div>
        </div>
        <span className="text-sm font-medium text-primary">{open ? "Close" : "Change"}</span>
      </button>
      {open && (
        <form onSubmit={save} className="mt-3 space-y-3">
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password" required autoFocus />
          <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" autoComplete="new-password" required />
          <button disabled={busy} className="btn-primary w-full py-3 sm:w-auto">{busy ? "Saving…" : "Save password"}</button>
        </form>
      )}
      {msg && <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${msg.bad ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{msg.text}</p>}
    </div>
  );
}
