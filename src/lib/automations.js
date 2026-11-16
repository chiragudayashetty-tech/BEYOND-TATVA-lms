// WhatsApp automations through AiSensy (API campaigns). The queue lives in Supabase (message_queue, migration
// 20261116000001); this file only sends. Each automation rule names an AiSensy "API campaign" that holds a
// Meta-approved template; templateParams fill its {{1}}, {{2}}.
// Docs: POST https://backend.aisensy.com/campaign/t1/api/v2 { apiKey, campaignName, destination, userName, templateParams }

export const AISENSY_URL = "https://backend.aisensy.com/campaign/t1/api/v2";
const PER_RUN = 40;

// Messages go out 9:00–20:59 IST only; anything queued at night waits for the morning run.
export function inSendWindow(now = new Date()) {
  const h = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  return h >= 9 * 60 && h < 21 * 60;
}

// '+919876543210' → '919876543210' (AiSensy wants country code, no plus).
export const aisensyDestination = (phone) => String(phone ?? "").replace(/[^0-9]/g, "");

export function aisensyBody(msg, apiKey) {
  return {
    apiKey,
    campaignName: msg.campaign,
    destination: aisensyDestination(msg.phone),
    userName: String(msg.name || "Parent").slice(0, 60),
    templateParams: (Array.isArray(msg.params) ? msg.params : []).map((p) => String(p ?? "").slice(0, 200)),
    source: "lms",
    // AiSensy creates/updates the contact from these, so every LMS lead lands in AiSensy with its school and stage.
    tags: (Array.isArray(msg.tags) ? msg.tags : []).map((t) => String(t).slice(0, 50)).slice(0, 10),
    attributes: Object.fromEntries(Object.entries(msg.attributes ?? {}).map(([k, v]) => [k, String(v ?? "").slice(0, 100)])),
    ...(msg.media_url ? { media: { url: msg.media_url, filename: msg.media_url.split("/").pop().split("?")[0] || "media" } } : {}),
  };
}

export async function sendAisensy(msg, { apiKey = process.env.AISENSY_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) return { ok: false, error: "AISENSY_API_KEY is not set" };
  if (!msg.campaign) return { ok: false, error: "No AiSensy campaign name on this automation" };
  try {
    const res = await fetchImpl(AISENSY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(aisensyBody(msg, apiKey)),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    if (res.ok) return { ok: true };
    let reason = text;
    try {
      const j = JSON.parse(text);
      reason = j.message || j.errorMessage || j.error || text;
    } catch {}
    return { ok: false, error: `AiSensy ${res.status}: ${String(reason).slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: `AiSensy not reachable: ${e.message}`.slice(0, 200) };
  }
}

// AiSensy refuses API campaigns to opted-out contacts ("API Campaign Opt-out" switch). Its wording varies.
export const isOptOutError = (e) => /opt(ed)?[\s_-]*out|unsubscrib/i.test(String(e ?? ""));

// One sender run: claim a batch, send each, record the result. db = service-role client.
export async function runAutomations(db, { now = new Date(), force = false, send = sendAisensy } = {}) {
  if (!force && !inSendWindow(now)) return { waiting: true, sent: 0, failed: 0 };
  if (!process.env.AISENSY_API_KEY && send === sendAisensy) return { off: true, sent: 0, failed: 0 };
  const { data: batch, error } = await db.rpc("automation_claim", { p_limit: PER_RUN });
  if (error) throw new Error(error.message);
  let sent = 0, failed = 0;
  for (const msg of batch ?? []) {
    const r = await send(msg);
    if (!r.ok && isOptOutError(r.error)) {
      // The parent opted out in AiSensy (STOP etc.): record it and mark them Do not contact. Not a failure.
      await db.rpc("automation_opted_out", { p_id: msg.id, p_reason: "Opted out on WhatsApp" });
      continue;
    }
    await db.rpc("automation_done", { p_id: msg.id, p_ok: r.ok, p_error: r.ok ? null : r.error });
    if (r.ok) sent++;
    else {
      failed++;
      console.warn("automation send failed", msg.rule_key, r.error);
    }
  }
  return { sent, failed };
}
