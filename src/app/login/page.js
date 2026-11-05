"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { safeNext } from "@/lib/safe-next";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

// Phone/WhatsApp codes need DLT registration in India; the tab appears once NEXT_PUBLIC_PHONE_LOGIN=1 is set.
const PHONE_LOGIN = process.env.NEXT_PUBLIC_PHONE_LOGIN === "1";

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
  const next = safeNext(params.get("next"));
  const [method, setMethod] = useState("email");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
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
  const phone = () => `+91${contact.replace(/\D/g, "").slice(-10)}`;

  async function google() {
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

  // Email codes are 8 digits (Supabase setting), SMS codes 6. Full code typed, pasted or autofilled → verify.
  const codeLength = method === "email" ? 8 : 6;
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
    const { error } =
      method === "email"
        ? await supabase.auth.verifyOtp({ email: contact.trim(), token, type: "email" })
        : await supabase.auth.verifyOtp({ phone: phone(), token, type: "sms" });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    router.replace(next);
    router.refresh();
  }

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
      <h1 className="text-2xl font-semibold">Sign in or sign up</h1>
      <p className="mt-1 text-sm text-muted">New here? This same step creates your account. Use the student&apos;s own Google account or email.</p>

      <button onClick={google} disabled={googleBusy} aria-live="polite" className="btn-secondary mt-6 min-h-12 w-full py-3">
        {googleBusy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>}
        {googleBusy ? "Opening Google sign-in…" : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" /> or get a code by email <div className="h-px flex-1 bg-border" />
      </div>

      {PHONE_LOGIN && <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-medium">
        {["email", "phone"].map((m) => (
          <button key={m} onClick={() => { setMethod(m); setSent(false); setError(""); setContact(""); }}
            className={`rounded-lg py-2 capitalize transition ${method === m ? "bg-surface text-fg shadow-sm" : "text-muted"}`}>
            {m}
          </button>
        ))}
      </div>}

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
            We sent a {codeLength}-digit code to <b className="text-fg">{method === "email" ? contact : phone()}</b>.
            {method === "email" && " You can also just tap the link in the email."}
          </p>
          <input className="input text-center text-2xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={codeLength} value={code} onChange={(e) => onCode(e.target.value)} onPaste={(e) => { e.preventDefault(); onCode(e.clipboardData.getData("text")); }} placeholder={"•".repeat(codeLength)} aria-label={`${codeLength}-digit code`} autoFocus required />
          <button disabled={busy} className="btn-primary w-full py-3">{busy ? "Checking…" : "Verify and continue"}</button>
          <button type="button" onClick={() => { setSent(false); setCode(""); }} className="w-full text-sm text-muted hover:text-fg">
            Use a different {method}
          </button>
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
      </div>
    </div>
  );
}
