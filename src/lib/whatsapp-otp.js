import { createHmac, timingSafeEqual } from "node:crypto";

// Supabase "Send SMS" hook → WhatsApp (Meta Cloud API). Pure helpers, unit-tested in tests/whatsapp-otp.test.mjs.

const MAX_SKEW_SECONDS = 300;

// Standard Webhooks signature (what Supabase auth hooks use).
// secret: "v1,whsec_<base64>" from Supabase → Auth → Hooks. Header: "v1,<base64sig> v1,<base64sig2>".
export function verifyHookSignature(rawBody, headers, secret, now = Date.now()) {
  const id = headers["webhook-id"];
  const ts = headers["webhook-timestamp"];
  const sigHeader = headers["webhook-signature"];
  if (!secret || !id || !ts || !sigHeader || !/^\d+$/.test(ts)) return false;
  if (Math.abs(now / 1000 - Number(ts)) > MAX_SKEW_SECONDS) return false;
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64"));
  return sigHeader.split(" ").some((part) => {
    const sig = Buffer.from(part.replace(/^v1,/, ""));
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

// "+919845012345" / "919845012345" → "919845012345" (WhatsApp wants digits with country code). Indian mobiles only.
export function whatsappNumber(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 10 ? d : null;
  return ten && /^[6-9]\d{9}$/.test(ten) ? `91${ten}` : null;
}

// Meta "Authentication" template: one body parameter (the code) and a copy-code / one-tap button that takes it too.
export function otpTemplateMessage(to, otp, template = "login_code", language = "en") {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: language },
      components: [
        { type: "body", parameters: [{ type: "text", text: otp }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] },
      ],
    },
  };
}
