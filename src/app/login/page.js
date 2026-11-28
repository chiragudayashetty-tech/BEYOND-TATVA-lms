"use client";

import FactLoader from "@/components/FactLoader";
import { startNavLoader } from "@/components/TopLoader";
import SocialLinks from "@/components/SocialLinks";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { safeNext } from "@/lib/safe-next";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

import { cleanEmail, indianMobile, parseLoginId, passwordProblem, showPhone } from "@/lib/login-id";
import { supportWhatsApp } from "@/lib/social";
import LangToggle from "@/components/LangToggle";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import OpenCodeChat from "@/components/OpenCodeChat";
import { readLang, saveLang } from "@/lib/lang";

// How long a WhatsApp code usually takes (Chirag 2026-11-27: "wait 10 sec"). "Send again" still waits 60 s:
// the server allows 1 code per minute per number, so an earlier resend would only fail.
const CODE_WAIT = 10;

// Words on the sign-in screens, in English and ಕನ್ನಡ. Error messages stay English for now.
const T = {
  en: {
    whatsappTitle: "Welcome! 👋", whatsappSub: "Sign in or join with your WhatsApp number.",
    signupTitle: "Create your account", signupSub: "Use the student's email and mobile number.",
    forgotTitle: "Forgot password", forgotSub: "Type the number or email you signed up with.",
    addEmailTitle: "Add your email", addEmailSub: "For payment receipts and course updates.",
    pickTitle: "Which student?", signinTitle: "Sign in", signinSub: "Use Google, or your phone / email and password.",
    codeTitle: "Check WhatsApp", waLabel: "WhatsApp number", waPlaceholder: "10-digit number",
    send: "Send code on WhatsApp", sending: "Sending…", sendAgain: (s) => `Send again in ${s}s`,
    waitNote: `The code comes on WhatsApp. Please wait about ${CODE_WAIT} seconds.`,
    newHere: "New here? This creates your account.", or: "or",
    emailSignup: "Create account with email",
    sentTo: (n) => <>Code sent to <b className="text-fg">{n}</b></>,
    waitBox: `The code takes about ${CODE_WAIT} seconds. Please wait, don't ask for a new one yet.`,
    verify: "Verify and continue", checking: "Checking…", noCode: "Didn't get it?", resendIn: "Resend in", resend: "Resend code",
    otherNumber: "Use a different number", havePw: "Already have a password?", pwLogin: "Log in with password", consent: "Students under 18 need a parent or guardian's consent to join.",
  },
  kn: {
    whatsappTitle: "ಸ್ವಾಗತ! 👋", whatsappSub: "ನಿಮ್ಮ WhatsApp ನಂಬರ್‌ನಿಂದ ಲಾಗಿನ್ ಆಗಿ ಅಥವಾ ಸೇರಿ.",
    signupTitle: "ಖಾತೆ ತೆರೆಯಿರಿ", signupSub: "ವಿದ್ಯಾರ್ಥಿಯ ಇಮೇಲ್ ಮತ್ತು ಮೊಬೈಲ್ ನಂಬರ್ ಬಳಸಿ.",
    forgotTitle: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?", forgotSub: "ಸೇರುವಾಗ ಕೊಟ್ಟ ನಂಬರ್ ಅಥವಾ ಇಮೇಲ್ ಟೈಪ್ ಮಾಡಿ.",
    addEmailTitle: "ನಿಮ್ಮ ಇಮೇಲ್ ಸೇರಿಸಿ", addEmailSub: "ಪಾವತಿ ರಸೀದಿ ಮತ್ತು ಕೋರ್ಸ್ ಸುದ್ದಿಗಾಗಿ.",
    pickTitle: "ಯಾವ ವಿದ್ಯಾರ್ಥಿ?", signinTitle: "ಲಾಗಿನ್", signinSub: "Google, ಅಥವಾ ಫೋನ್ / ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ.",
    codeTitle: "WhatsApp ನೋಡಿ", waLabel: "WhatsApp ನಂಬರ್", waPlaceholder: "10 ಅಂಕಿಯ ನಂಬರ್",
    send: "WhatsAppನಲ್ಲಿ ಕೋಡ್ ಕಳುಹಿಸಿ", sending: "ಕಳುಹಿಸುತ್ತಿದೆ…", sendAgain: (s) => `${s} ಸೆಕೆಂಡ್ ನಂತರ ಮತ್ತೆ ಕಳುಹಿಸಿ`,
    waitNote: `ಕೋಡ್ WhatsAppನಲ್ಲಿ ಬರುತ್ತದೆ. ಸುಮಾರು ${CODE_WAIT} ಸೆಕೆಂಡ್ ಕಾಯಿರಿ.`,
    newHere: "ಹೊಸಬರೇ? ಇದರಿಂದ ನಿಮ್ಮ ಖಾತೆ ತೆರೆಯುತ್ತದೆ.", or: "ಅಥವಾ",
    emailSignup: "ಇಮೇಲ್‌ನಿಂದ ಖಾತೆ ತೆರೆಯಿರಿ",
    sentTo: (n) => <><b className="text-fg">{n}</b> ಗೆ ಕೋಡ್ ಕಳುಹಿಸಲಾಗಿದೆ</>,
    waitBox: `ಕೋಡ್ ಬರಲು ಸುಮಾರು ${CODE_WAIT} ಸೆಕೆಂಡ್ ಬೇಕು. ಈಗಲೇ ಹೊಸ ಕೋಡ್ ಕೇಳಬೇಡಿ.`,
    verify: "ಪರಿಶೀಲಿಸಿ ಮುಂದುವರಿಯಿರಿ", checking: "ಪರಿಶೀಲಿಸುತ್ತಿದೆ…", noCode: "ಕೋಡ್ ಬರಲಿಲ್ಲವೇ?", resendIn: "ಮತ್ತೆ ಕಳುಹಿಸಲು", resend: "ಮತ್ತೆ ಕಳುಹಿಸಿ",
    otherNumber: "ಬೇರೆ ನಂಬರ್ ಬಳಸಿ", havePw: "ಪಾಸ್‌ವರ್ಡ್ ಇದೆಯೇ?", pwLogin: "ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಲಾಗಿನ್", consent: "18 ವರ್ಷದೊಳಗಿನ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪೋಷಕರ ಒಪ್ಪಿಗೆ ಬೇಕು.",
  },
};

// Sign in: Google, phone or email + password (no code, Chirag 2026-11-14), or an email code.
// Login code by WhatsApp (mobile; Supabase phone OTP → /api/auth/send-otp → AiSensy) when NEXT_PUBLIC_PHONE_LOGIN=1,
// or by email. Main screen (Chirag 2026-11-16): WhatsApp code + Google; a WhatsApp code also creates the account
// (onboarding follows). Email + password and email sign-up sit underneath.
const CODE_KEY = "bt_login_code"; // last code sent from this tab: { contact, at }
function rememberCode(contact) {
  try { sessionStorage.setItem(CODE_KEY, JSON.stringify({ contact, at: Date.now() })); } catch {}
}
const WHATSAPP_CODES = process.env.NEXT_PUBLIC_PHONE_LOGIN === "1";
const HOME = WHATSAPP_CODES ? "whatsapp" : "password";
const friendly = (msg = "") => {
  // Hook errors (Chirag 2026-11-20): 429 = our 1-per-minute / 5-per-hour limit; "unavailable due to hook" =
  // Supabase pausing the hook after several failures in a row (usually from tapping Send again and again).
  // 422 = our "number isn't on WhatsApp" answer (api/auth/send-otp). Must sit above the generic /hook/ rule.
  if (/not on whatsapp|hook.*422|422.*hook/i.test(msg)) return "This number is not on WhatsApp, so we can't send the code. Use a number that has WhatsApp, or sign in with Google or email.";
  if (/hook.*429|429.*hook/i.test(msg)) return "Please wait a minute before asking for another code. Use the latest code we sent.";
  if (/unavailable due to hook/i.test(msg)) return "Too many tries in a row. Wait 2–3 minutes, then tap Send code once.";
  if (/hook/i.test(msg)) return "Couldn't send the WhatsApp code right now. Wait a minute and try once more, or use Google.";
  if (/phone.*(disabled|not enabled)|Phone logins/i.test(msg)) return "Sign-in with mobile number isn't switched on yet. Use your email and the same password.";
  if (/Invalid login credentials/i.test(msg)) return "Wrong number/email or password. Try again, or tap Forgot password.";
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return "Google sign-in isn't switched on yet. Use your phone or email.";
  if (/expired|invalid/i.test(msg)) return "That code is wrong or too old. Type the latest code we sent, or send a new one.";
  if (/rate|seconds|too many/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return msg || "Something went wrong. Try again.";
};

// Last line on the main and sign-up screens: for people who already made a password.
function PasswordNote({ onClick, t = T.en }) {
  return (
    <p className="mt-4 border-t border-border pt-4 text-center text-sm text-muted">
      {t.havePw} <button type="button" onClick={onClick} className="min-h-11 font-medium text-primary">{t.pwLogin}</button>
    </p>
  );
}

function GoogleButton({ onClick, busy, className = "mt-6" }) {
  return (
        <button onClick={onClick} disabled={busy} aria-live="polite" className={`btn-secondary ${className} min-h-12 w-full py-3`}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>}
          {busy ? "Opening Google sign-in…" : "Continue with Google"}
        </button>
  );
}

function saveNextCookie(next) {
  document.cookie = `bt_next=${encodeURIComponent(next)}; path=/; max-age=1800; samesite=lax; secure`;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // "whatsapp" (main) | "password" | "signup" | "forgot" | "code" (email code) | "codeSent"
  const [mode, setMode] = useState(HOME);
  // /pay sends ?phone= so the number the parent paid with is already filled in.
  const [contact, setContact] = useState(() => (params.get("phone") || "").replace(/\D/g, "").slice(-10));
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ? "That sign-in link has expired. Send a new code." : "");
  const [inAppBrowser, setInAppBrowser] = useState(null);
  const [copied, setCopied] = useState(false);
  // Accounts linked to the WhatsApp number just verified (student's or parent's number), for "Which student?".
  const [accounts, setAccounts] = useState([]);
  // Seconds until another WhatsApp code may be asked for (the server allows 1 per minute per number).
  const [wait, setWait] = useState(0);
  const [lang, setLang] = useState("en");
  const t = T[lang];
  const changeLang = (l) => { setLang(l); saveLang(l); };
  useEffect(() => {
    const timer = window.setTimeout(() => setLang(readLang()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  // Tapping "Open WhatsApp" leaves this page; Android can reload the tab when they come back. Bring back the
  // code box for a code sent in the last 10 minutes (no new code, which would cancel the one in WhatsApp).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(CODE_KEY) || "null");
        const ago = saved ? (Date.now() - saved.at) / 1000 : Infinity;
        if (saved?.contact && ago < 600) { setContact(saved.contact); setMode("codeSent"); setWait(Math.max(0, Math.ceil(60 - ago))); }
        else sessionStorage.removeItem(CODE_KEY);
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

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
  // profile once, right after onboarding (see OnboardingChat).
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
  const rememberNext = () => saveNextCookie(next);

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
    startNavLoader();
    router.replace(next);
    router.refresh();
  }

  async function passwordSubmit(e) {
    e.preventDefault();
    rememberNext();
    setError("");
    // Sign-up: email AND mobile (both go on the account). Sign-in: either one.
    const id = mode === "signup" ? { kind: "email", email: cleanEmail(email) } : parseLoginId(contact);
    if (mode === "signup") {
      if (!id.email) return setError("Type a real email address (e.g. name@gmail.com).");
      if (!indianMobile(mobile)) return setError("Type a 10-digit Indian mobile number.");
      const problem = passwordProblem(password);
      if (problem) return setError(problem);
      if (password !== password2) return setError("The two passwords don't match.");
    } else if (!id) return setError("Type your mobile number or email.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, phone: mobile, password, website: e.target.website?.value || "" }) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setError(data.error || "Couldn't create the account. Try again.");
      }
      const { error } = await supabase.auth.signInWithPassword(id.kind === "phone" ? { phone: `+${id.phone}`, password } : { email: id.email, password });
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
    if (!parseLoginId(contact)) return setError("Type the email or mobile number you signed up with.");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: contact }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) setError(data.error || "Couldn't send. Try again.");
      else setNotice("sent");
    } catch {
      setError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Where the code goes: a mobile number → WhatsApp, an email → email.
  const codeTo = parseLoginId(contact);
  const byWhatsApp = WHATSAPP_CODES && codeTo?.kind === "phone";

  async function sendCode(e) {
    rememberNext();
    e.preventDefault();
    setError("");
    if (!codeTo || (codeTo.kind === "phone" && !WHATSAPP_CODES)) return setError(WHATSAPP_CODES ? "Type your mobile number or email." : "Type your email.");
    if (wait > 0) return setError(`Please wait ${wait} seconds before asking for another code.`);
    setBusy(true);
    // Students who gave this number before WhatsApp login existed: open their existing account (lib/phone-account).
    if (byWhatsApp) await fetch("/api/auth/phone-account", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: codeTo.phone }) }).catch(() => {});
    const { error } = byWhatsApp
      ? await supabase.auth.signInWithOtp({ phone: `+${codeTo.phone}`, options: { shouldCreateUser: true, channel: "sms" } })
      : await supabase.auth.signInWithOtp({ email: codeTo.email, options: { emailRedirectTo: callback } });
    setBusy(false);
    setWait(60); // WhatsApp and email both allow 1 code per minute; a failed send may still use it up
    if (error) {
      const msg = friendly(error.message);
      setError(msg);
      if (byWhatsApp && /not on WhatsApp/.test(msg)) { setWait(0); window.alert(msg); } // no code was sent, so no wait
    } else {
      setCode(""); setMode("codeSent");
      rememberCode(contact);
    }
  }

  // Email codes are 8 digits, WhatsApp codes 6 (Supabase settings). Full code typed, pasted or autofilled → verify.
  const codeLength = byWhatsApp ? 6 : 8;
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
    // WhatsApp codes are checked by our server, which then remembers the proved number for "Which student?".
    const { error } = byWhatsApp
      ? await fetch("/api/auth/phone-accounts", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "verify", phone: codeTo.phone, token }) })
          .then((x) => x.json()).then((x) => ({ error: x.error ? { message: x.error } : null }))
          .catch(() => ({ error: { message: "Couldn't check the code. Try again." } }))
      : await supabase.auth.verifyOtp({ email: codeTo?.email ?? contact.trim(), token, type: "email" });
    if (error) {
      setBusy(false);
      return setError(friendly(error.message));
    }
    await fetch("/api/auth/settle", { method: "POST" }).catch(() => {});
    setBusy(false);
    // New WhatsApp accounts have no email yet: ask for one right away (needed for receipts and password resets).
    // Returning students (already onboarded) go straight in; only brand-new numbers are asked.
    if (byWhatsApp) {
      // One number can belong to several accounts (siblings, or a duplicate made by mistake): let them pick.
      const res = await fetch("/api/auth/phone-accounts").then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (res?.accounts?.length > 1) {
        setAccounts(res.accounts);
        return go("pick");
      }
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user && !user.email) {
        const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
        if (!profile) return go("addEmail");
      }
    }
    await finish();
  }

  // "Which student?": open one of the accounts linked to this number, or delete an empty extra one.
  async function pickAccount(a) {
    setError("");
    setBusy(true);
    const res = await fetch("/api/auth/phone-accounts", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "open", id: a.id }) }).then((x) => x.json()).catch(() => ({ error: "Couldn't open that account. Try again." }));
    if (res.error) { setBusy(false); return setError(res.error); }
    if (res.token_hash) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: res.token_hash, type: "magiclink" });
      if (error) { setBusy(false); return setError(friendly(error.message)); }
    }
    setBusy(false);
    await finish();
  }

  async function deleteAccount(a) {
    if (!window.confirm(`Delete the empty account "${a.name}"? This can't be undone.`)) return;
    setError("");
    setBusy(true);
    const res = await fetch("/api/auth/phone-accounts", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", id: a.id }) }).then((x) => x.json()).catch(() => ({ error: "Couldn't delete it. Try again." }));
    setBusy(false);
    if (res.error) return setError(res.error);
    setAccounts((list) => list.filter((x) => x.id !== a.id));
  }

  // Adds the email to the signed-in WhatsApp account. Supabase emails a confirmation link; the email is
  // attached once it's tapped (so nobody can claim someone else's address).
  async function addEmail(e) {
    e.preventDefault();
    setError("");
    const clean = cleanEmail(email);
    if (!clean) return setError("Type a real email address (e.g. name@gmail.com).");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: clean }, { emailRedirectTo: callback });
    setBusy(false);
    if (error) return setError(/already|registered|exists/i.test(error.message)
      ? "This email already has a Beyond Tatva account. Sign out and sign in with that email, or use another one."
      : friendly(error.message));
    setNotice("emailSent");
  }

  const id = parseLoginId(contact);
  const helpLink = supportWhatsApp(`Hi Beyond Tatva! I forgot my password. My login is ${id?.kind === "phone" ? showPhone(id.phone) : contact}. Student name: `);

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
    <div className="mb-3 flex justify-end"><LangToggle lang={lang} onChange={changeLang} /></div>
    <div className="card p-6 shadow-xl shadow-black/5 sm:p-8">
      {mode === "codeSent" && byWhatsApp && <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#25D366]/15"><WhatsAppIcon className="h-8 w-8" /></div>}
      <h1 className="text-2xl font-semibold">{mode === "addEmail" ? t.addEmailTitle : mode === "pick" ? t.pickTitle : mode === "signup" ? t.signupTitle : mode === "forgot" ? t.forgotTitle : mode === "whatsapp" ? t.whatsappTitle : mode === "codeSent" && byWhatsApp ? t.codeTitle : t.signinTitle}</h1>
      {mode !== "codeSent" && mode !== "pick" && <p className="mt-1 text-sm text-muted">
        {mode === "addEmail" ? t.addEmailSub : mode === "signup" ? t.signupSub : mode === "forgot" ? t.forgotSub : mode === "whatsapp" ? t.whatsappSub : t.signinSub}
      </p>}

      {mode === "whatsapp" && <>
        <form onSubmit={sendCode} className="mt-6 space-y-3">
          <label className="label flex items-center gap-1.5" htmlFor="wa-phone"><WhatsAppIcon className="h-4 w-4" /> {t.waLabel}</label>
          <div className="flex gap-2">
            <span className="input flex w-24 shrink-0 items-center justify-center gap-1.5"><WhatsAppIcon className="h-5 w-5" /> +91</span>
            <input id="wa-phone" className="input text-lg" type="tel" inputMode="numeric" value={contact} onChange={(e) => setContact(e.target.value)}
              placeholder={t.waPlaceholder} autoComplete="tel-national" required />
          </div>
          <button disabled={busy || wait > 0} className="btn-primary min-h-12 w-full py-3">{busy ? t.sending : wait > 0 ? t.sendAgain(wait) : <><WhatsAppIcon className="h-5 w-5 [&>path]:fill-white" /> {t.send}</>}</button>
          <p className="text-center text-xs text-muted">⏱️ {t.waitNote}<br />{t.newHere}</p>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" /> {t.or} <div className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton onClick={google} busy={googleBusy} className="" />
        <button type="button" onClick={() => go("signup")} className="mt-4 min-h-11 w-full text-sm font-medium text-primary">{t.emailSignup}</button>
        <PasswordNote t={t} onClick={() => go("password")} />
      </>}

      {(mode === "password" || mode === "signup") && <>
        <GoogleButton onClick={google} busy={googleBusy} />
        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" /> or with phone / email <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={passwordSubmit} className="space-y-3">
          {mode === "signup" ? <>
            <div>
              <label className="label" htmlFor="su-email">Email</label>
              <input id="su-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                autoComplete="email" autoCapitalize="none" spellCheck={false} required />
            </div>
            <div>
              <label className="label" htmlFor="su-phone">Mobile number (WhatsApp)</label>
              <div className="flex gap-2">
                <span className="input grid w-16 shrink-0 place-items-center">+91</span>
                <input id="su-phone" className="input" type="tel" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile number" autoComplete="tel-national" required />
              </div>
              <p className="mt-1 text-xs text-muted">Forgot your password later? Type the email or this number and we email you a reset link.</p>
            </div>
          </> : (
            <div>
              <label className="label" htmlFor="login-id">Mobile number or email</label>
              <input id="login-id" className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Mobile number or email"
                autoComplete="username" autoCapitalize="none" spellCheck={false} required />
            </div>
          )}
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
          {mode === "password"
            ? <button type="button" onClick={() => go("signup")} className="min-h-11 font-medium text-primary">New here? Create account</button>
            : <button type="button" onClick={() => go(HOME)} className="min-h-11 font-medium text-primary">Have an account? Sign in with WhatsApp</button>}
          <button type="button" onClick={() => go("forgot")} className="min-h-11 text-muted hover:text-fg">Forgot password?</button>
        </div>
        <button type="button" onClick={() => go("code")} className="mt-1 min-h-11 w-full text-sm text-muted hover:text-fg">{WHATSAPP_CODES ? "Get a login code on WhatsApp or email" : "Email me a login code instead"}</button>
        {mode === "signup" && <PasswordNote onClick={() => go("password")} />}
      </>}

      {mode === "addEmail" && (notice === "emailSent" ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="rounded-xl bg-success-soft p-3 text-success">We sent a link to <b>{cleanEmail(email)}</b>. Tap it to confirm your email (check Spam too). You can carry on now.</p>
          <button type="button" onClick={finish} className="btn-primary min-h-12 w-full py-3">Continue</button>
        </div>
      ) : (
        <form onSubmit={addEmail} className="mt-6 space-y-3">
          <label className="label" htmlFor="add-email">Email (student&apos;s or parent&apos;s)</label>
          <input id="add-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            autoComplete="email" autoCapitalize="none" spellCheck={false} required autoFocus />
          <button disabled={busy} className="btn-primary min-h-12 w-full py-3">{busy ? "Saving…" : "Save email"}</button>
          <button type="button" onClick={finish} className="min-h-11 w-full text-sm text-muted hover:text-fg">Skip for now</button>
        </form>
      ))}

      {mode === "forgot" && (notice === "sent" ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="rounded-xl bg-success-soft p-3 text-success">If <b>{contact}</b> has an account, we&apos;ve emailed a reset link to the email on that account. Open it, then set a new password. Check Spam too.</p>
          {helpLink && <a href={helpLink} target="_blank" rel="noopener noreferrer" className="block min-h-11 text-center text-muted hover:text-fg">No email after 10 minutes? Message us on WhatsApp</a>}
          <button type="button" onClick={() => go(HOME)} className="btn-secondary w-full py-3">Back to sign in</button>
        </div>
      ) : (
        <form onSubmit={forgot} className="mt-6 space-y-3">
          <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Mobile number or email" autoComplete="username" autoCapitalize="none" required />
          <button disabled={busy} className="btn-primary min-h-12 w-full py-3">{busy ? "Sending…" : "Reset my password"}</button>
          <button type="button" onClick={() => go(HOME)} className="min-h-11 w-full text-sm text-muted hover:text-fg">Back to sign in</button>
        </form>
      ))}

      {mode === "code" && (
        <form onSubmit={sendCode} className="mt-6 space-y-3">
          <label className="label" htmlFor="code-to">{WHATSAPP_CODES ? "Mobile number (WhatsApp) or email" : "Email"}</label>
          <input id="code-to" className="input" type={WHATSAPP_CODES ? "text" : "email"} value={contact} onChange={(e) => setContact(e.target.value)}
            placeholder={WHATSAPP_CODES ? "Mobile number or email" : "you@example.com"} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
          <button disabled={busy || wait > 0} className="btn-primary min-h-12 w-full py-3">{busy ? "Sending…" : wait > 0 ? `Send again in ${wait}s` : byWhatsApp ? "Send code on WhatsApp" : "Send code"}</button>
          <button type="button" onClick={() => go(HOME)} className="min-h-11 w-full text-sm text-muted hover:text-fg">Use a password instead</button>
        </form>
      )}

      {mode === "pick" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted">This number is linked to more than one account. Which student is signing in?</p>
          {accounts.map((a) => (
            <div key={a.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-xs text-muted">{a.empty ? "Empty account: no lessons or payments yet" : "Has lessons or a course"}</p>
              </div>
              <button type="button" disabled={busy || !a.canOpen} onClick={() => pickAccount(a)} className="btn-primary min-h-11 px-4">Open</button>
              {a.empty && !a.current && <button type="button" disabled={busy} onClick={() => deleteAccount(a)} className="min-h-11 px-2 text-sm text-danger">Delete</button>}
            </div>
          ))}
          <p className="text-xs text-muted">Brother or sister? Each student keeps their own account. You can only delete an empty one.</p>
        </div>
      )}

      {mode === "codeSent" && (
        <form onSubmit={verify} className="mt-6 space-y-3">
          {byWhatsApp ? <>
            <p className="text-sm text-muted">{t.sentTo(showPhone(codeTo.phone))}</p>
            <p className="rounded-xl bg-warning-soft p-3 text-sm font-medium">⏱️ {t.waitBox}</p>
            <OpenCodeChat kn={lang === "kn"} />
          </> : <p className="text-sm text-muted">We sent an {codeLength}-digit code to <b className="text-fg">{contact}</b>. You can also just tap the link in the email.</p>}
          <input className="input text-center text-2xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={codeLength} value={code} onChange={(e) => onCode(e.target.value)} onPaste={(e) => { e.preventDefault(); onCode(e.clipboardData.getData("text")); }} placeholder={"•".repeat(codeLength)} aria-label={`${codeLength}-digit code`} autoFocus required />
          <button disabled={busy} className="btn-primary min-h-12 w-full py-3">{busy ? t.checking : t.verify}</button>
          <p className="text-center text-sm text-muted">{t.noCode}{" "}
            {wait > 0
              ? <span>{t.resendIn} <b className="tabular-nums text-fg">{Math.floor(wait / 60)}:{String(wait % 60).padStart(2, "0")}</b></span>
              : <button type="button" disabled={busy} onClick={sendCode} className="font-semibold text-primary hover:underline">{t.resend}</button>}
          </p>
          <button type="button" onClick={() => { try { sessionStorage.removeItem(CODE_KEY); } catch {} go(byWhatsApp && mode === "codeSent" ? HOME : "code"); }} className="min-h-11 w-full text-sm text-muted hover:text-fg">{byWhatsApp ? t.otherNumber : "Use a different email"}</button>
        </form>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    </div>
    <p className="mt-6 text-center text-xs text-muted">{t.consent}</p>
    <p className="mt-2 text-center text-xs text-muted">By continuing you agree to our <a href="/terms" className="font-medium text-primary underline">Terms</a> and <a href="/privacy" className="font-medium text-primary underline">Privacy policy</a>.</p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-bg place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <Suspense fallback={<div className="card"><FactLoader inline label="sign in" /></div>}>
          <LoginForm />
        </Suspense>
        <SocialLinks className="mt-4 justify-center" />
      </div>
    </div>
  );
}
