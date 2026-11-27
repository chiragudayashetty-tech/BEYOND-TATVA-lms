import { NextResponse } from "next/server";
import { readJson } from "@/lib/body";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/server";
import { claimTokenValid } from "@/lib/guest-pay";

// POST /api/guest-claim { payment_id, claim } → { ok }
// "Change number" on /pay: the payer signed in with a different WhatsApp number. Moves their waiting /pay
// purchase to the number they just proved, so claim_purchases unlocks it for this account.
// Needs the claim token only the paying browser got from guest-verify, and only while the purchase is unclaimed.
export async function POST(request) {
  const { user } = await getSession();
  if (!user?.phone || !user.phone_confirmed_at) return NextResponse.json({ error: "Sign in with a WhatsApp code first" }, { status: 401 });
  const { tooBig, body } = await readJson(request);
  if (tooBig) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const paymentId = String(body?.payment_id || "");
  if (!/^pay_[A-Za-z0-9]{6,30}$/.test(paymentId) || !claimTokenValid(paymentId, body?.claim)) {
    return NextResponse.json({ error: "This payment can't be moved" }, { status: 403 });
  }
  const phone = `+91${String(user.phone).replace(/\D/g, "").slice(-10)}`;
  const { data, error } = await createAdminClient().from("purchases")
    .update({ phone, suggested_student: null, suggested_at: null })
    .eq("reference", paymentId).eq("status", "pending").select("id");
  if (error) {
    console.error("guest-claim failed", paymentId, error.message);
    return NextResponse.json({ error: "Couldn't move the payment. Message us with your payment ID." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, moved: data?.length ?? 0 });
}
