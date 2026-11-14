"use client";

import SocialLinks from "@/components/SocialLinks";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { safeNext } from "@/lib/safe-next";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

import { loginLabel, parseLoginId, passwordProblem } from "@/lib/login-id";
import { supportWhatsApp } from "@/lib/social";

// Sign in: Google, phone or email + password (no code, Chirag 2026-11-14), or an email code.
// WhatsApp codes (api/auth/send-otp) come back once Meta verification is done.
const friendly = (msg = "") => {
  if (/Invalid login credentials/i.test(msg)) return "Wrong number/email or password. Try again, or tap Forgot password.";
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return "Google sign-in isn't switched on yet. Use your phone or email.";
  if (/expired|invalid/i.test(msg)) return "That code didn't work. Check it, or send a new one.";
  if (/rate|seconds|too many/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return msg || "Something went wrong. Try again.";
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // "login" | "signup" | "forgot" | "code" (email code) | "codeSent"
  const [mode, setMode] = useState("login");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ? "That sign-in link has expired. Send a new code." : "");
  const [inAppBrowser, setInAppBrowser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const inApp = /WhatsApp|Instagram|FBAN|FBAV|Messenger/i.test(ua);
    if (!inApp) return;
    const platform = /iPhone|iPad|iPod/i.test(ua) ? "ios" : "android";
    const timer = window.setTimeout(() => setInAppBrowser(platform), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function copyCurrentLink() {
    const link = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const field = document.createElement("textarea");
        field.value = link;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const success = document.execCommand("copy");
        field.remove();
        if (!success) throw new Error("Copy failed");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy didn’t work. Use your browser’s menu to copy this page link.");
    }
  }

  // Remember where they came from (website link / QR: ?src=loki&utm_source=qr). Saved to the
  // profile once, right after onboarding (see OnboardingForm).
  useEffect(() => {
    const tags = {};
    for (const k of ["src", "utm_source", "utm_medium", "utm_campaign"]) {
      const v = params.get(k);
      if (v) tags[k] = v.slice(0, 80);
    }
    if (!Object.keys(tags).length) return;
    try { localStorage.setItem("bt_signup_source", JSON.stringify(tags)); } catch {}
  }, [params]);

  const supabase = createClient();
  const callback = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;

  // Backup of where to go after sign-in. If Supabase drops the ?next= from the return address
  // (not on its Redirect URLs allowlist), the callback and the front page still find it here.
  const rememberNext = () => { document.cookie = `bt_next=${encodeURIComponent(next)}; path=/; max-age=1800; samesite=lax; secure`; };

  async function google() {
    rememberNext();
    if (googleBusy) return;
    setGoogleBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback } });
      if (error) {
        setGoogleBusy(false);
        setError(friendly(error.message));
      }
    } catch {
      setGoogleBusy(false);
      setError("Couldn't start Google sign-in. Check your connection and try again.");
    }
  }

  const go = (m) => { setMode(m); setError(""); setNotice(""); setCode(""); };

  // Signed in on this device: claim website purchases, then continue (as auth/callback does).
  async function finish() {
    await supabase.rpc("claim_purchases");
    router.replace(next);
    router.refresh();
  }

  async function passwordSubmit(e) {
    e.preventDefault();
    rememberNext();
    setError("");
    const id = parseLoginId(contact);
    if (!id) return setError("Type a 10-digit mobile number or an email address.");
    if (mode === "signup") {
      const problem = passwordProblem(password);
      if (problem) return setError(problem);
      if (password !== password2) return setError("The two passwords don't match.");
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: contact, password, website: e.target.website?.value || "" }) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setError(data.error || "Couldn't create the account. Try again.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: id.email, password });
      if (error) return setError(friendly(error.message));
      await finish();
    } catch {
      setError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function forgot(e) {
    e.preventDefault();
    setError("");
    const id = parseLoginId(contact);
    if (!id) return setError("Type the mobile number or email you signed up with.");
    if (id.kind === "phone") {
      // WhatsApp reset codes need Meta verification; until then Studio sets a temporary password.
      return setNotice("phone");
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(id.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profile?password=new#password")}`,
    });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else setNotice("email");
  }

  async function sendCode(e) {
    rememberNext();
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email: contact.trim(), options: { emailRedirectTo: callback } });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else setMode("codeSent");
  }

  // Email codes are 8 digits (Supabase setting). Full code typed, pasted or autofilled → verify.
  const codeLength = 8;
  function onCode(value) {
    const digits = value.replace(/\D/g, "").slice(0, codeLength);
    setCode(digits);
    if (digits.length === codeLength && !busy) verify(null, digits);
  }

  async function verify(e, typed) {
    e?.preventDefault();
    const token = (typed ?? code).trim();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({ email: contact.trim(), token, type: "email" });
    if (error) {
      setBusy(false);
      return setError(friendly(error.message));
    }
    await fetch("/api/auth/settle", { method: "POST" }).catch(() => {});
    setBusy(false);
    await finish();
  }

  const id = parseLoginId(contact);
  const helpLink = supportWhatsApp(`Hi Beyond Tatva! I forgot my password. My login number is ${id?.kind === "phone" ? loginLabel({ phone: id.phone }) : contact}. Student name: `);

  return (
    <>
    {inAppBrowser && <div className="card mb-4 border border-brand/30 p-5 shadow-sm" role="note">
      <h2 className="text-lg font-semibold">Open this page in Chrome / Safari to sign in</h2>
      <p className="mt-2 text-sm text-muted">
        {inAppBrowser === "ios"
          ? "Tap ••• or Share, then choose Open in Safari."
          : "Tap ⋮ (menu), then choose Open in Chrome."}
      </p>
      <button type="button" onClick={copyCurrentLink} className="btn-secondary mt-4 w-full py-2.5">
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>}
    <div className="card p-6 shadow-xl shadow-black/5 sm:p-8">
      <h1 className="text-2xl font-semibold">{mode === "signup" ? "Create your account" : mode === "forgot" ? "Forgot password" : "Sign in"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "signup" ? "Use the student's own phone number or email. You'll log in with it every time."
          : mode === "forgot" ? "Type the number or email you signed up with."
          : "Use Google, or your phone number / email and password."}
      </p>

      {(mode === "login" || mode === "signup") && <>
        <button onClick={google} disabled={googleBusy} aria-live="polite" className="btn-secondary mt-6 min-h-12 w-full py-3">
          {googleBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>}
          {googleBusy ? "Opening Google sign-in…" : "Continue with Google"}
        </button>
        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" /> or with phone / email <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={passwordSubmit} className="space-y-3">
          <div>
            <label className="label" htmlFor="login-id">Mobile number or email</label>
            <input id="login-id" className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="98765 43210 or you@example.com"
              autoComplete="username" autoCapitalize="none" spellCheck={false} required />
          </div>
          <div>
            <label className="label" htmlFor="login-pw">{mode === "signup" ? "Make a password (8+ characters)" : "Password"}</label>
            <div className="relative">
              <input id="login-pw" className="input pr-16" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-0 min-w-14 px-3 text-xs font-medium text-muted hover:text-fg">{showPw ? "Hide" : "Show"}</button>
            </div>
          </div>
          {mode === "signup" && <div>
            <label className="label" htmlFor="login-pw2">Type the password again</label>
            <input id="login-pw2" className="input" type={showPw ? "text" : "password"} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" required />
          </div>}
          {/* Bots fill every field; people never see this one. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button disabled={busy} className="btn-primary min-h-12 w-full py-3">
            {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          {mode === "login"
            ? <button type="button" onClick={() => go("signup")} className="min-h-11 font-medium text-primary">New here? Create account</button>
            : <button type="button" onClick={() => go("login")} className="min-h-11 font-medium text-primary">Have an account? Sign in</button>}
          <button type="button" onClick={() => go("forgot")} className="min-h-11 text-muted hover:text-fg">Forgot password?</button>
        </div>
        <button type="button" onClick={() => go("code")} className="mt-1 min-h-11 w-full text-sm text-muted hover:text-fg">Email me a login code instead</button>
      </>}

      {mode === "forgot" && (notice === "email" ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="rounded-xl bg-success-soft p-3 text-success">If <b>{contact}</b> has an account, a reset link is on its way. Open it on this phone, then set a new password.</p>
          <button type="button" onClick={() => go("login")} className="btn-secondary w-full py-3">Back to sign in</button>
        </div>
      ) : notice === "phone" ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="rounded-xl bg-surface-2 p-3">Message us on WhatsApp from the parent&apos;s phone. We&apos;ll check it&apos;s you and send a temporary password, usually the same day. (Reset by WhatsApp code is coming soon.)</p>
          {helpLink && <a href={helpLink} target="_blank" rel="noopener noreferrer" className="btn-primary block w-full py-3 text-center">Message us on WhatsApp</a>}
          <button type="button" onClick={() => go("login")} className="btn-secondary w-full py-3">Back to sign in</button>
        </div>
      ) : (
        <form onSubmit={forgot} className="mt-6 space-y-3">
          <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="98765 43210 or you@example.com" autoComplete="username" autoCapitalize="none" required />
          <button disabled={busy} className="btn-primary min-h-12 w-full py-3">{busy ? "Sending…" : "Reset my password"}</button>
          <button type="button" onClick={() => go("login")} className="min-h-11 w-full text-sm text-muted hover:text-fg">Back to sign in</button>
        </form>
      ))}

      {mode === "code" && (
        <form onSubmit={sendCode} className="mt-6 space-y-3">
          <input className="input" type="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          <button disabled={busy} className="btn-primary min-h-12 w-full py-3">{busy ? "Sending…" : "Send code"}</button>
          <button type="button" onClick={() => go("login")} className="min-h-11 w-full text-sm text-muted hover:text-fg">Use a password instead</button>
        </form>
      )}

      {mode === "codeSent" && (
        <form onSubmit={verify} className="mt-6 space-y-3">
          <p className="text-sm text-muted">We sent an {codeLength}-digit code to <b className="text-fg">{contact}</b>. You can also just tap the link in the email.</p>
          <input className="input text-center text-2xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={codeLength} value={code} onChange={(e) => onCode(e.target.value)} onPaste={(e) => { e.preventDefault(); onCode(e.clipboardData.getData("text")); }} placeholder={"•".repeat(codeLength)} aria-label={`${codeLength}-digit code`} autoFocus required />
          <button disabled={busy} className="btn-primary min-h-12 w-full py-3">{busy ? "Checking…" : "Verify and continue"}</button>
          <button type="button" onClick={() => go("code")} className="min-h-11 w-full text-sm text-muted hover:text-fg">Use a different email</button>
        </form>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    </div>
    </>
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
        <SocialLinks className="mt-4 justify-center" />
      </div>
    </div>
  );
}
