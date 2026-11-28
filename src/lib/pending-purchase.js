import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Paid already but hasn't filled in their details yet (purchase waiting for this email or login phone)?
// Stops double payments. phone: the account's confirmed login phone only.
export async function hasPendingPurchase(email, phone) {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  const ors = [];
  if (email) ors.push(`email.eq."${email.toLowerCase().replace(/["\\]/g, "")}"`);
  if (/^[6-9]\d{9}$/.test(digits)) ors.push(`phone.eq.+91${digits}`);
  if (!ors.length) return false;
  const { data } = await createAdminClient().from("purchases").select("id").eq("status", "pending").or(ors.join(",")).limit(1).maybeSingle();
  return Boolean(data);
}
