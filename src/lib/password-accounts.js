import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Email + password accounts are created without proving the inbox (no code, Chirag 2026-11-14). So someone
// could create an account for another person's email before they sign up. Guard: the first time the inbox is
// really proven (Google, email code/link, password-reset link), a password set before that is replaced with a
// random one, and the owner sets their own in Profile. Only accounts flagged password_unverified are touched.
const PROVEN = new Set(["oauth", "otp", "magiclink", "email/signup", "recovery", "invite", "email_change"]);

export async function settleUnverifiedPassword(supabase) {
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub || !c.app_metadata?.password_unverified) return false;
  const methods = (c.amr ?? []).map((a) => a?.method);
  if (!methods.some((m) => PROVEN.has(m))) return false;
  const admin = createAdminClient();
  // Read the live flag (the token can be older than a change made a moment ago).
  const { data: live } = await admin.auth.admin.getUserById(c.sub);
  if (!live?.user?.app_metadata?.password_unverified) return false;
  const { error } = await admin.auth.admin.updateUserById(c.sub, {
    password: randomBytes(24).toString("base64url"),
    app_metadata: { ...live.user.app_metadata, password_unverified: false },
  });
  if (error) console.error("password settle failed", error.message);
  return !error;
}

// A temporary password Studio reads out to a parent (forgot password on a phone account, until WhatsApp codes).
export function tempPassword() {
  const words = ["mango", "river", "tiger", "cloud", "lotus", "coral", "pearl", "amber", "maple", "comet"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  return `${pick()}-${pick()}-${String(randomBytes(2).readUInt16BE() % 10000).padStart(4, "0")}`;
}
