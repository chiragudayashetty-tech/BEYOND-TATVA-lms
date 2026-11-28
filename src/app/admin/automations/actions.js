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

// ── Your rules (custom automations built in Studio) ──────────────────────────
// p: { key?, title, trigger, delay_minutes, from_hour, to_hour, run_at, recipient, aud_stage, aud_school, aud_grade, aud_module, aud_m0, include_past, template_key }
export async function saveCustomRule(p) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_save_custom_rule", { p });
  if (error?.message.includes("automation_custom_shape")) return { ok: false, error: "Check the times: it must start before it ends, and a fixed date needs a date." };
  return error ? done(error) : { ...done(null), key: data };
}

export async function deleteCustomRule(key) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_custom_rule", { p_key: key });
  if (error?.message.includes("rule_has_history")) return { ok: false, error: "This rule has already sent messages. Turn it Off instead; its history stays." };
  return done(error);
}

// How many people the rule reaches: in total, right now, and already messaged.
export async function previewCustomRule(key) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_custom_preview", { p_key: key });
  if (error) return { ok: false, error: error.message };
  const r = data?.[0] ?? { total: 0, due_now: 0, already: 0 };
  return { ok: true, total: r.total, dueNow: r.due_now, already: r.already };
}
