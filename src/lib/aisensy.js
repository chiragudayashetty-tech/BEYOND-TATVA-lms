// AiSensy (WhatsApp Business API) sender. One call = one approved template message ("API campaign" in AiSensy).
// Env (Vercel, server only): AISENSY_API_KEY, plus a campaign name per message type:
//   AISENSY_OTP_CAMPAIGN      login codes (Authentication template: {{1}} = code, copy-code button)
//   AISENSY_PAYMENT_CAMPAIGN  payment confirmation to the parent ({{1}} = student first name, {{2}} = amount)
// Nothing is sent when the key or that campaign is missing. Pure payload builder is unit-tested.
const API = "https://backend.aisensy.com/campaign/t1/api/v2";

export function aisensyPayload({ apiKey, campaign, to, name = "Parent", params = [], buttonCode = null }) {
  const body = { apiKey, campaignName: campaign, destination: to, userName: String(name || "Parent").slice(0, 60), templateParams: params.map(String) };
  if (buttonCode) body.buttons = [{ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: String(buttonCode) }] }];
  return body;
}

export const aisensyCampaign = (kind) => process.env.AISENSY_API_KEY && process.env[`AISENSY_${kind}_CAMPAIGN`] ? process.env[`AISENSY_${kind}_CAMPAIGN`] : null;

// Returns { ok, status, error }. Never throws.
export async function sendAisensy(kind, { to, name, params, buttonCode }) {
  const campaign = aisensyCampaign(kind);
  if (!campaign) return { ok: false, error: "not configured" };
  try {
    const r = await fetch(API, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(aisensyPayload({ apiKey: process.env.AISENSY_API_KEY, campaign, to, name, params, buttonCode })),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      const text = (await r.text().catch(() => "")).slice(0, 200);
      console.error("aisensy send failed", kind, r.status, text);
      return { ok: false, status: r.status, error: text };
    }
    return { ok: true, status: r.status };
  } catch (e) {
    console.error("aisensy unreachable", kind, e.message);
    return { ok: false, error: e.message };
  }
}
