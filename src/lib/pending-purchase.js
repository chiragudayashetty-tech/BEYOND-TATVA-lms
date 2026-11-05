import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Paid already but hasn't filled in their details yet (purchase waiting for this email)? Stops double payments.
export async function hasPendingPurchase(email) {
  if (!email) return false;
  const { data } = await createAdminClient().from("purchases").select("id").eq("status", "pending").eq("email", email.toLowerCase()).limit(1).maybeSingle();
  return Boolean(data);
}
