import { NextResponse } from "next/server";
import { readJson } from "@/lib/body";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { claimTokenValid } from "@/lib/guest-pay";
import { passwordProblem } from "@/lib/login-id";
import { trackServer } from "@/lib/track";

// POST /api/guest-session { payment_id, claim, password } → { ok, phone }
// "Code not coming?" on /pay: the parent just paid, so they skip the WhatsApp code and choose a password instead.
// Proof = the claim token only the paying browser got from guest-verify. Limits, so this can never open
// someone else's account:
//  - only a NEW number (an existing account on that number still needs the code: we never sign into it here);
//  - only while the purchase is still waiting (unclaimed) and less than 3 days old;
//  - one account per payment (a second try finds the number taken and is sent to /login).
// Next time they sign in at /login with this mobile number + password (or a WhatsApp code once it arrives).
export const dynamic = "force-dynamic";
const say = (status, error, extra) => NextResponse.json({ error, ...extra }, { status });
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export async function POST(request) {
  const { tooBig, body } = await readJson(request, 1_000);
  if (tooBig) return say(413, "Too much data.");
  const paymentId = String(body?.payment_id || "");
  if (!/^pay_[A-Za-z0-9]{6,30}$/.test(paymentId) || !claimTokenValid(paymentId, body?.claim)) {
    return say(403, "Please use the WhatsApp code, or message us and we'll unlock it.");
  }
  const problem = passwordProblem(body?.password);
  if (problem) return say(400, problem);

  const admin = createAdminClient();
  const { data: purchase } = await admin.from("purchases").select("phone, status, created_at").eq("reference", paymentId).maybeSingle();
  if (!purchase?.phone) return say(409, "We're still saving your payment. Wait a minute and try again.");
  if (purchase.status !== "pending") return say(409, "This payment is already linked to an account. Sign in to open the course.", { signin: true });
  if (Date.now() - new Date(purchase.created_at).getTime() > MAX_AGE_MS) return say(403, "This link is too old. Message us and we'll unlock it.");

  const phone = purchase.phone; // +91XXXXXXXXXX, from OUR order notes, never from the browser
  const { data: created, error } = await admin.auth.admin.createUser({
    phone, phone_confirm: true, password: body.password,
    app_metadata: { signup: "paid-no-code", paid_ref: paymentId },
  });
  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message)) {
      return say(409, "This number already has an account. Sign in with it (WhatsApp code or password) and the course unlocks.", { signin: true });
    }
    console.error("guest-session create failed", error.status, error.message);
    return say(500, "Couldn't create the account. Try again in a minute, or message us.");
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ phone, password: body.password });
  if (signInError) {
    console.error("guest-session sign-in failed", signInError.message);
    return say(500, "Account made, but signing in failed. Sign in with your number and the password you chose.", { signin: true });
  }
  console.info("guest-session ok", paymentId);
  await trackServer("signed_up", created?.user?.id, { method: "paid-no-code" });
  return NextResponse.json({ ok: true, phone: phone.slice(3) });
}
