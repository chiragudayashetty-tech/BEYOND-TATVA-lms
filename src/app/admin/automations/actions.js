"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutomations } from "@/lib/automations";

const done = (error) => {
  revalidatePath("/admin/automations");
  return error ? { ok: false, error: error.message.includes("admin") ? "Only an admin can do this." : error.message } : { ok: true };
};

export async function saveAutomation(key, campaign, enabled) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_automation", { p_key: key, p_campaign: campaign ?? "", p_enabled: Boolean(enabled) });
  if (error?.message.includes("enabled_needs_campaign")) return { ok: false, error: "Add the AiSensy campaign name before switching it on." };
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
