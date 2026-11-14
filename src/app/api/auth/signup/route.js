import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson } from "@/lib/body";
import { cleanEmail, indianMobile, isStaffDomain, passwordProblem } from "@/lib/login-id";

// POST { email, phone, password } → creates the account with BOTH (no code, Chirag 2026-11-14). The browser
// then signs in with supabase.auth.signInWithPassword; later sign-ins use the email or the phone.
// Limits: 5 new accounts per IP per hour, 20 per day (password_signup_allowed). Studio addresses refused.
export const dynamic = "force-dynamic";
const say = (status, error) => NextResponse.json({ error }, { status });

export async function POST(request) {
  const { tooBig, body } = await readJson(request, 2_000);
  if (tooBig) return say(413, "Too much data.");
  if (body?.website) return say(400, "Something went wrong. Try again."); // honeypot field bots fill in
  const email = cleanEmail(body?.email);
  if (!email) return say(400, "Type a real email address (e.g. name@gmail.com).");
  const phone = indianMobile(body?.phone);
  if (!phone) return say(400, "Type a 10-digit Indian mobile number.");
  const problem = passwordProblem(body?.password);
  if (problem) return say(400, problem);

  const admin = createAdminClient();
  const { data: staff } = await admin.from("studio_admins").select("entry").in("entry", [email, `@${email.split("@")[1]}`]).limit(1);
  if (isStaffDomain(email) || staff?.length) return say(403, "Team accounts sign in with Google or an email code.");

  const ip = (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  const { data: allowed, error: limitError } = await admin.rpc("password_signup_allowed", { p_ip: ip });
  // If the check itself fails (e.g. migration not applied yet) sign-up still works, as with WhatsApp codes.
  if (limitError) console.error("signup limit check failed", limitError.message);
  else if (allowed !== "ok") return say(429, "Too many new accounts from this network. Try again later, or continue with Google.");

  // Neither is proven by a code. password_unverified: the first Google / email-code sign-in replaces the
  // password (lib/password-accounts), so a stranger can't keep an account made on someone else's email.
  const { error } = await admin.auth.admin.createUser({
    email, email_confirm: true, phone, phone_confirm: true, password: body.password,
    app_metadata: { signup: "password", password_unverified: true },
  });
  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message)) {
      const which = /phone/i.test(error.message) ? "This mobile number" : /email/i.test(error.message) ? "This email" : "This email or mobile number";
      return say(409, `${which} already has an account. Sign in, or tap Forgot password. (Brother or sister? Each student needs their own email and number.)`);
    }
    console.error("password signup failed", error.status, error.message);
    return say(500, "Couldn't create the account. Try again in a minute.");
  }
  console.info("password signup ok");
  return NextResponse.json({ ok: true });
}
