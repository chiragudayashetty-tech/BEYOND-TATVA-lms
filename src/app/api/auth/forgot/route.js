import { NextResponse } from "next/server";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { readJson } from "@/lib/body";
import { parseLoginId } from "@/lib/login-id";

// POST { id: email or mobile } → emails a password-reset link, automatically (Chirag 2026-11-14: no SMS).
// A mobile number is turned into the account's email on the server (email_for_phone); the email is never
// shown. The answer is the same whether or not an account exists, so nobody can probe numbers or emails.
// The link uses the "Reset password" email template (docs/login-setup.md) → /auth/callback → Profile → Password.
export const dynamic = "force-dynamic";
const SAME = { ok: true };

export async function POST(request) {
  const { tooBig, body } = await readJson(request, 1_000);
  if (tooBig) return NextResponse.json({ error: "Too much data." }, { status: 413 });
  const id = parseLoginId(body?.id);
  if (!id) return NextResponse.json({ error: "Type the email or mobile number you signed up with." }, { status: 400 });

  const admin = createAdminClient();
  let email = id.kind === "email" ? id.email : null;
  if (id.kind === "phone") {
    // Same limits as login codes: 1 a minute, 5 an hour per number.
    const { data: allowed, error: limitError } = await admin.rpc("otp_send_allowed", { p_phone: id.phone });
    if (limitError) console.error("reset limit check failed", limitError.message);
    else if (allowed !== "ok") return NextResponse.json({ error: "Please wait a minute before asking again." }, { status: 429 });
    const { data, error } = await admin.rpc("email_for_phone", { p_phone: id.phone });
    if (error) console.error("reset lookup failed", error.message);
    email = data || null;
  }
  if (!email) return NextResponse.json(SAME);

  // Plain (non-cookie) client: the link must work on any phone, not only this browser.
  const anon = createPlainClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const origin = new URL(request.url).origin;
  const { error } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/profile?password=new#password")}`,
  });
  if (error) {
    console.error("reset email failed", error.status, error.message);
    if (error.status === 429) return NextResponse.json({ error: "Too many reset emails right now. Try again in an hour." }, { status: 429 });
  }
  return NextResponse.json(SAME);
}
