"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

// UI only: buttons route to the demo dashboard until Supabase auth is connected.
export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState("phone");
  const [sent, setSent] = useState(false);

  return (
    <div className="glow grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-7">
          <h1 className="text-2xl font-bold">Welcome 👋</h1>
          <p className="mt-1 text-sm text-muted">Students, parents and teachers all log in here.</p>

          <button onClick={() => router.push("/profiles")} className="btn-ghost mt-6 w-full py-3">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-border" /> or use a code <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 font-ui text-sm">
            {["phone", "email"].map((m) => (
              <button
                key={m}
                onClick={() => { setMethod(m); setSent(false); }}
                className={`rounded-lg py-2 capitalize transition ${method === m ? "bg-brand text-white" : "text-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>

          {!sent ? (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-3">
              {method === "phone" ? (
                <div className="flex gap-2">
                  <span className="input w-20 text-center">+91</span>
                  <input className="input" type="tel" placeholder="98765 43210" required />
                </div>
              ) : (
                <input className="input" type="email" placeholder="you@example.com" required />
              )}
              <button className="btn-primary w-full py-3">Send code</button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); router.push("/onboarding"); }} className="space-y-3">
              <p className="text-sm text-muted">Enter the 6-digit code we sent you.</p>
              <input className="input text-center text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="••••••" required />
              <button className="btn-primary w-full py-3">Verify & continue</button>
              <button type="button" onClick={() => setSent(false)} className="w-full text-sm text-muted hover:text-foreground">Change number</button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Students under 18 need a parent or guardian&apos;s consent to join.
        </p>
      </div>
    </div>
  );
}
