import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Paid already but hasn't filled in their details yet (purchase waiting for this email or login phone)? Stops double payments.
// Phone sign-ins have no email, so they match on the last 10 digits of the login phone.
export async function hasPendingPurchase(email, phone) {
  const admin = createAdminClient();
  if (email) {
    const { data } = await admin.from("purchases").select("id").eq("status", "pending").eq("email", email.toLowerCase()).limit(1).maybeSingle();
    if (data) return true;
  }
  const ten = String(phone || "").replace(/\D/g, "").slice(-10);
  if (ten.length === 10) {
    const { data } = await admin.from("purchases").select("id").eq("status", "pending").eq("phone", ten).limit(1).maybeSingle();
    if (data) return true;
  }
  return false;
}
