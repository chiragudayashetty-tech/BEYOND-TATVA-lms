"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutomations } from "@/lib/automations";

const done = (error) => {
  revalidatePath("/admin/automations");
  return error ? { ok: false, error: error.message.includes("admin") ? "Only an admin can do this." : error.message } : { ok: true };
};

export async function saveAutomation(key, campaign, enabled, template) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_automation", { p_key: key, p_campaign: campaign ?? "", p_enabled: Boolean(enabled), p_template: template || null });
  if (error?.message.includes("enabled_needs_campaign")) return { ok: false, error: "Pick a template (or type a campaign name) before switching it on." };
  return done(error);
}

export async function retryMessage(id) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_retry_message", { p_id: id });
  return done(error);
}

// "Send now": admin check with the signed-in user, then the service-role sender (ignores the 9am–9pm window).
export async function sendNow() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Only an admin can do this." };
  try {
    const r = await runAutomations(createAdminClient(), { force: true });
    revalidatePath("/admin/automations");
    if (r.off) return { ok: false, error: "AISENSY_API_KEY is not set in Vercel yet." };
    return { ok: true, message: `Sent ${r.sent}, failed ${r.failed}.` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function saveTemplate(t) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_template", { p: t });
  if (error?.message.includes("wa_templates_key_check")) return { ok: false, error: "Key: small letters, numbers and _ only (e.g. a1_kn)." };
  if (error?.message.includes("media_url")) return { ok: false, error: "Media link must start with https://" };
  return done(error);
}

// Queue one template for people picked in Pipeline or on a lead page. targets: [{ lead_id, student_id }]
export async function sendTemplate(template, targets) {
  if (!Array.isArray(targets) || !targets.length) return { ok: false, error: "Nobody selected." };
  const supabase = await createClient();
  const clean = targets.slice(0, 500).map((t) => ({ lead_id: t.lead_id ?? null, student_id: t.student_id ?? null }));
  const { data, error } = await supabase.rpc("admin_send_template", { p_template: template, p_targets: clean });
  if (error) return done(error);
  const r = data?.[0] ?? {};
  revalidatePath("/admin/automations");
  revalidatePath("/admin/pipeline", "layout");
  const parts = [`${r.queued} queued`, r.duplicate && `${r.duplicate} already sent today`, r.skipped && `${r.skipped} do not contact`, r.no_phone && `${r.no_phone} no phone`];
  return { ok: true, message: `${parts.filter(Boolean).join(", ")}. Goes out within 5 minutes (9am–9pm).` };
}
