import { AISENSY_URL } from "./automations.js";
import { otpTemplateMessage } from "./whatsapp-otp.js";

// Sends a 6-digit code on WhatsApp (login codes and parent confirmation).
// AiSensy first (AISENSY_API_KEY + AISENSY_OTP_CAMPAIGN: an API campaign on an approved
// Authentication template with a copy-code button); else Meta Cloud API (WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID).

export function codeProvider(env = process.env) {
  if (env.AISENSY_API_KEY && env.AISENSY_OTP_CAMPAIGN) return "aisensy";
  if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) return "meta";
  return null;
}
export const whatsappCodesReady = (env = process.env) => codeProvider(env) !== null;

// AiSensy body for an Authentication template: the code fills {{1}} and the copy-code button.
export function aisensyCodeBody(to, code, campaign, apiKey) {
  return {
    apiKey, campaignName: campaign, destination: to, userName: "Beyond Tatva user", source: "lms-otp",
    templateParams: [code],
    buttons: [{ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: code }] }],
  };
}

// to: "91XXXXXXXXXX". kind: "login" | "parent". Returns { ok, error? } and never throws.
export async function sendWhatsappCode(to, code, kind = "login", { env = process.env, fetchImpl = fetch } = {}) {
  const provider = codeProvider(env);
  if (!provider) return { ok: false, error: "not_configured" };
  try {
    let r;
    if (provider === "aisensy") {
      const campaign = (kind === "parent" && env.AISENSY_PARENT_CAMPAIGN) || env.AISENSY_OTP_CAMPAIGN;
      r = await fetchImpl(AISENSY_URL, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(aisensyCodeBody(to, code, campaign, env.AISENSY_API_KEY)), signal: AbortSignal.timeout(8000),
      });
    } else {
      const template = (kind === "parent" && env.WHATSAPP_PARENT_TEMPLATE) || env.WHATSAPP_OTP_TEMPLATE || "login_code";
      r = await fetchImpl(`https://graph.facebook.com/v21.0/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
        body: JSON.stringify(otpTemplateMessage(to, code, template, env.WHATSAPP_OTP_LANG || "en")), signal: AbortSignal.timeout(8000),
      });
    }
    if (r.ok) return { ok: true };
    const text = await r.text().catch(() => "");
    console.error(`whatsapp code (${provider}) failed`, r.status, text.slice(0, 200));
    return { ok: false, error: "send_failed" };
  } catch (e) {
    console.error(`whatsapp code (${provider}) unreachable`, e.message);
    return { ok: false, error: "unreachable" };
  }
}
