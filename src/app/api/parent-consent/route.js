import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { readJson } from "@/lib/body";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { otpTemplateMessage, whatsappNumber } from "@/lib/whatsapp-otp";

// Parent confirmation (DPDP: verifiable consent for a child's data).
// POST /api/parent-consent { action: "send" }            → WhatsApp code to the parent's number on file
// POST /api/parent-consent { action: "verify", code }    → student types the code the parent read out
// The code is made here, only its hash is stored (parent_consent_issue, service role), and the phone
// always comes from the profile, never from the browser, so a student can't send it to their own number.
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
const MESSAGES = {
  cooldown: "Please wait a minute before asking for another code.",
  daily_limit: "Too many codes today. Try again tomorrow, or WhatsApp us for help.",
  no_phone: "We need a parent's number that is different from yours. WhatsApp us to update it.",
  already: "Your parent has already confirmed.",
};

const maskPhone = (p) => (p ? `+${p.slice(0, 2)} ••••• ${p.slice(-3)}` : "");

export async function POST(request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return json({ error: "Please sign in again." }, 401);
  const { tooBig, body } = await readJson(request, 1000);
  if (tooBig) return json({ error: "Request too large" }, 413);

  if (body?.action === "verify") {
    const code = String(body.code ?? "").replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) return json({ error: "Enter the 6-digit code." }, 400);
    const { data, error } = await supabase.rpc("parent_consent_verify", { p_code: code });
    if (error) return json({ error: "Couldn't check the code. Please try again." }, 503);
    const text = { wrong: "That code is not right. Check it with your parent.", expired: "That code has expired. Send a new one.",
      too_many: "Too many wrong tries. Send a new code.", no_code: "Send a code first." }[data];
    return data === "verified" ? json({ ok: true }) : json({ error: text ?? "Please try again." }, 400);
  }
  if (body?.action !== "send") return json({ error: "Unknown action" }, 400);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profile?.role !== "student") return json({ error: "Only student accounts need this." }, 403);
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return json({ error: "WhatsApp isn't set up yet. Please try later." }, 503);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const hash = createHash("sha256").update(code).digest("hex");
  const { data, error } = await createAdminClient().rpc("parent_consent_issue", { p_student: uid, p_code_sha256: hash });
  if (error) {
    console.error("parent consent issue failed", error.message);
    return json({ error: "Couldn't start. Please try again." }, 503);
  }
  if (data?.status !== "ok") return json({ error: MESSAGES[data?.status] ?? "Please try again." }, data?.status === "already" ? 409 : 429);

  const to = whatsappNumber(data.phone);
  if (!to) return json({ error: MESSAGES.no_phone }, 400);
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(otpTemplateMessage(to, code, process.env.WHATSAPP_PARENT_TEMPLATE || process.env.WHATSAPP_OTP_TEMPLATE || "login_code", process.env.WHATSAPP_OTP_LANG || "en")),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error("parent consent whatsapp failed", r.status, err?.error?.code);
      return json({ error: "Couldn't send the WhatsApp message. Please try again." }, 502);
    }
  } catch {
    return json({ error: "Couldn't reach WhatsApp. Please try again." }, 502);
  }
  return json({ ok: true, sent_to: maskPhone(data.phone) });
}
