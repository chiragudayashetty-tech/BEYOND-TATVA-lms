import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson } from "@/lib/body";
import { indianMobile, isStaffDomain } from "@/lib/login-id";
import { phoneVariants, pickAccount } from "@/lib/phone-account";

// POST { phone } → called by the login page just before a WhatsApp code is sent. If the number belongs to one
// existing account that has no login phone yet, it's added there (see lib/phone-account). Always answers
// { ok: true } so nobody can use it to find out which numbers have accounts.
export const dynamic = "force-dynamic";
const ok = () => NextResponse.json({ ok: true });

export async function POST(request) {
  const { tooBig, body } = await readJson(request, 500);
  if (tooBig) return ok();
  const phone = indianMobile(body?.phone);
  if (!phone) return ok();
  try {
    const admin = createAdminClient();
    const variants = phoneVariants(phone);
    const [students, guardians, siblings] = await Promise.all([
      admin.from("profiles").select("id").in("student_phone", variants).limit(5),
      admin.from("profiles").select("id").in("guardian_phone", variants).limit(5),
      admin.from("sibling_phones").select("phone_key").eq("phone_key", phone.slice(2)).limit(1),
    ]);
    const id = pickAccount((students.data ?? []).map((r) => r.id), (guardians.data ?? []).map((r) => r.id), (siblings.data ?? []).length > 0);
    if (!id) return ok();

    const { data } = await admin.auth.admin.getUserById(id);
    const user = data?.user;
    if (!user || user.phone || isStaffDomain(user.email)) return ok(); // already has a login number, or a team account
    const { data: staff } = await admin.from("studio_admins").select("entry").eq("entry", user.email ?? "").limit(1);
    if (staff?.length) return ok();

    // Fails harmlessly if another login already uses this number (then the code opens that one, as before).
    const { error } = await admin.auth.admin.updateUserById(id, { phone, phone_confirm: true });
    if (error && !/already|registered|exists|duplicate/i.test(error.message)) console.error("phone link failed", error.message);
    else if (!error) console.info("phone linked to existing account");
  } catch (e) {
    console.error("phone link error", e.message);
  }
  return ok();
}
