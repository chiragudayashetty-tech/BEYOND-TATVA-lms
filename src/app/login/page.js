"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

const friendly = (msg = "") => {
  if (/phone|sms/i.test(msg)) return "Phone login isn't switched on yet. Use email or Google for now.";
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return "Google sign-in isn't switched on yet. Use email for now.";
  if (/expired|invalid/i.test(msg)) return "That code didn't work. Check it, or send a new one.";
  if (/rate|seconds/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return msg || "Something went wrong. Try again.";
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [method, setMethod] = useState("email");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ? "That sign-in link has expired. Send a new code." : "");

  const supabase = createClient();
  const callback = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;
  const phone = () => `+91${contact.replace(/\D/g, "").slice(-10)}`;

  async function google() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback } });
    if (error) setError(friendly(error.message));
  }

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } =
      method === "email"
        ? await supabase.auth.signInWithOtp({ email: contact.trim(), options: { emailRedirectTo: callback } })
        : await supabase.auth.signInWithOtp({ phone: phone() });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else setSent(true);
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } =
      method === "email"
        ? await supabase.auth.verifyOtp({ email: contact.trim(), token: code.trim(), type: "email" })
        : await supabase.auth.verifyOtp({ phone: phone(), token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="card p-6 shadow-xl shadow-black/5 sm:p-8">
      <h1 className="text-2xl font-semibold">Sign in or sign up</h1>
      <p className="mt-1 text-sm text-muted">New here? This same step creates your account. Use the student&apos;s own Google account or email.</p>

      <button onClick={google} className="btn-secondary mt-6 w-full py-3">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" /> or get a code <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-medium">
        {["email", "phone"].map((m) => (
          <button key={m} onClick={() => { setMethod(m); setSent(false); setError(""); setContact(""); }}
            className={`rounded-lg py-2 capitalize transition ${method === m ? "bg-surface text-fg shadow-sm" : "text-muted"}`}>
            {m}
          </button>
        ))}
      </div>

      {!sent ? (
        <form onSubmit={sendCode} className="space-y-3">
          {method === "phone" ? (
            <div className="flex gap-2">
              <span className="input grid w-20 place-items-center">+91</span>
              <input className="input" type="tel" inputMode="numeric" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="98765 43210" required />
            </div>
          ) : (
            <input className="input" type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          )}
          <button disabled={busy} className="btn-primary w-full py-3">{busy ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm text-muted">
            We sent a 6-digit code to <b className="text-fg">{method === "email" ? contact : phone()}</b>.
            {method === "email" && " You can also just tap the link in the email."}
          </p>
          <input className="input text-center text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••" required />
          <button disabled={busy} className="btn-primary w-full py-3">{busy ? "Checking…" : "Verify and continue"}</button>
          <button type="button" onClick={() => { setSent(false); setCode(""); }} className="w-full text-sm text-muted hover:text-fg">
            Use a different {method}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-bg place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <Suspense fallback={<div className="card h-96" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-muted">Students under 18 need a parent or guardian&apos;s consent to join.</p>
      </div>
    </div>
  );
}
