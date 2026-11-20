import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyHookSignature, whatsappNumber } from "@/lib/whatsapp-otp";
import { sendWhatsappCode } from "@/lib/whatsapp-code";

// Supabase Auth "Send SMS" hook: Supabase makes the code, we deliver it on WhatsApp (AiSensy, or Meta Cloud API).
// Supabase → Authentication → Hooks → Send SMS → HTTPS → https://learn.beyondtatva.in/api/auth/send-otp
// Env (Vercel, server only): SEND_SMS_HOOK_SECRET (v1,whsec_… from that screen) + either AISENSY_API_KEY and
// AISENSY_OTP_CAMPAIGN, or WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID (src/lib/whatsapp-code.js).
const fail = (status, message) => NextResponse.json({ error: { http_code: status, message } }, { status });

export async function POST(request) {
  const raw = await request.text();
  const headers = Object.fromEntries(["webhook-id", "webhook-timestamp", "webhook-signature"].map((h) => [h, request.headers.get(h)]));
  if (!verifyHookSignature(raw, headers, process.env.SEND_SMS_HOOK_SECRET)) return fail(401, "bad signature");

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "bad json");
  }
  const to = whatsappNumber(body?.user?.phone);
  const otp = String(body?.sms?.otp || "");
  if (!to) return fail(400, "Use a 10-digit Indian mobile number.");
  if (!/^\d{4,10}$/.test(otp)) return fail(400, "missing code");

  // Limits (audit 2026-11-09): 1 code per minute, 5 per hour per number. Per-IP limits: Supabase Auth settings.
  // If the check itself fails we still send, so a database hiccup doesn't block every login.
  const { data: allowed, error: limitError } = await createAdminClient().rpc("otp_send_allowed", { p_phone: to });
  if (limitError) console.error("otp limit check failed", limitError.message);
  else if (allowed === "cooldown") return fail(429, "Please wait a minute before asking for another code.");
  else if (allowed === "hourly_limit") return fail(429, "Too many codes for this number. Try again in an hour, or use Google or email.");

  const sent = await sendWhatsappCode(to, otp, "login");
  if (sent.ok) return NextResponse.json({});
  if (sent.error === "not_configured") return fail(500, "WhatsApp login isn't set up yet. Use Google or email.");
  if (sent.error === "not_on_whatsapp") return fail(422, "This number is not on WhatsApp. Use a number that has WhatsApp, or sign in with Google or email.");
  if (sent.error === "unreachable") return fail(502, "Couldn't reach WhatsApp. Please try again.");
  return fail(502, "Couldn't send the code on WhatsApp. Check the number, or use Google or email.");
}
