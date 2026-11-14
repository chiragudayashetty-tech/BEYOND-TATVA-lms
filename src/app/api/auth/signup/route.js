import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson } from "@/lib/body";
import { isStaffDomain, parseLoginId, passwordProblem } from "@/lib/login-id";

// POST { id: phone or email, password } → creates the account (no code, Chirag 2026-11-14). The browser then
// signs in with supabase.auth.signInWithPassword. Phone accounts get a hidden login address (see lib/login-id).
// Limits: 5 new accounts per IP per hour, 20 per day (password_signup_allowed). Studio addresses refused.
export const dynamic = "force-dynamic";
const say = (status, error) => NextResponse.json({ error }, { status });

export async function POST(request) {
  const { tooBig, body } = await readJson(request, 2_000);
  if (tooBig) return say(413, "Too much data.");
  if (body?.website) return say(400, "Something went wrong. Try again."); // honeypot field bots fill in
  const id = parseLoginId(body?.id);
  if (!id) return say(400, "Type a 10-digit mobile number or an email address.");
  const problem = passwordProblem(body?.password);
  if (problem) return say(400, problem);

  const admin = createAdminClient();
  if (id.kind === "email") {
    const domain = `@${id.email.split("@")[1]}`;
    const { data: staff } = await admin.from("studio_admins").select("entry").in("entry", [id.email, domain]).limit(1);
    if (isStaffDomain(id.email) || staff?.length) return say(403, "Team accounts sign in with Google or an email code.");
  }

  const ip = (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  const { data: allowed, error: limitError } = await admin.rpc("password_signup_allowed", { p_ip: ip });
  // If the check itself fails (e.g. migration not applied yet) sign-up still works, as with WhatsApp codes.
  if (limitError) console.error("signup limit check failed", limitError.message);
  else if (allowed !== "ok") return say(429, "Too many new accounts from this network. Try again later, or continue with Google.");

  const { error } = await admin.auth.admin.createUser(
    id.kind === "phone"
      ? { email: id.email, email_confirm: true, phone: id.phone, phone_confirm: true, password: body.password, app_metadata: { signup: "phone_password" } }
      : { email: id.email, email_confirm: true, password: body.password, app_metadata: { signup: "email_password", password_unverified: true } },
  );
  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message)) {
      return say(409, id.kind === "phone"
        ? "This number already has an account. Log in, or tap Forgot password. (Brother or sister? Use the student's own number or email.)"
        : "This email already has an account. Log in, continue with Google, or tap Forgot password.");
    }
    console.error("password signup failed", error.status, error.message);
    return say(500, "Couldn't create the account. Try again in a minute.");
  }
  console.info("password signup ok", id.kind);
  return NextResponse.json({ ok: true });
}
