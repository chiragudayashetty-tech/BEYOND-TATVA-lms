import { NextResponse } from "next/server";
import { otpTemplateMessage, verifyHookSignature, whatsappNumber } from "@/lib/whatsapp-otp";

// Supabase Auth "Send SMS" hook: Supabase makes the code, we deliver it on WhatsApp (Meta Cloud API).
// Supabase → Authentication → Hooks → Send SMS → HTTPS → https://learn.beyondtatva.in/api/auth/send-otp
// Env (Vercel, server only): SEND_SMS_HOOK_SECRET (v1,whsec_… from that screen), WHATSAPP_TOKEN,
// WHATSAPP_PHONE_NUMBER_ID, optional WHATSAPP_OTP_TEMPLATE (default login_code) and WHATSAPP_OTP_LANG (default en).
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

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return fail(500, "WhatsApp login isn't set up yet. Use Google or email.");

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(otpTemplateMessage(to, otp, process.env.WHATSAPP_OTP_TEMPLATE || "login_code", process.env.WHATSAPP_OTP_LANG || "en")),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      console.error("whatsapp otp failed", r.status, data?.error?.code, data?.error?.message);
      return fail(502, "Couldn't send the code on WhatsApp. Check the number, or use Google or email.");
    }
    return NextResponse.json({});
  } catch {
    return fail(502, "Couldn't reach WhatsApp. Please try again.");
  }
}
