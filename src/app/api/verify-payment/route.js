import { NextResponse } from "next/server";
import { readJson } from "@/lib/body";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getSession } from "@/lib/supabase/server";
import { COURSE_ID } from "@/lib/catalog";
import { fetchOrder, paymentSignatureValid, razorpayKeys } from "@/lib/razorpay";

// POST /api/verify-payment { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Unlocks the course only when the signature matches AND the order was created for this student.
// Records the purchase (reference = payment id, so retries count once), then claims it for this account.
export async function POST(request) {
  const { user, profile } = await getSession();
  if (!user || (profile && profile.role !== "student")) return NextResponse.json({ error: "Sign in as a student first" }, { status: 401 });
  const keys = razorpayKeys();
  if (!keys) return NextResponse.json({ error: "Online payments aren't set up yet" }, { status: 500 });

  const { tooBig, body } = await readJson(request);
  if (tooBig) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body || {};
  if (!orderId || !paymentId || !signature) return NextResponse.json({ verified: false, error: "Missing payment details" }, { status: 400 });
  if (!paymentSignatureValid(orderId, paymentId, signature, keys.secret)) {
    return NextResponse.json({ verified: false, error: "Payment signature mismatch" }, { status: 400 });
  }

  let order;
  try {
    const r = await fetchOrder(keys, orderId);
    if (!r.ok) throw new Error(`order ${r.status}`);
    order = r.data;
  } catch (e) {
    console.error("razorpay order lookup failed", orderId, e.message);
    return NextResponse.json({ verified: true, unlocked: false, error: "Payment received; unlocking is delayed. Tap “Check for my payment” in a minute." }, { status: 502 });
  }
  if (order.notes?.student_id !== user.id || order.notes?.course !== COURSE_ID) {
    return NextResponse.json({ verified: false, error: "This payment belongs to a different account" }, { status: 400 });
  }

  // Match only on this student's own login (email, or phone for phone sign-ins). The parent's mobile stays
  // in the Razorpay order notes: matching on it could unlock someone else's account with that number.
  const { data: status, error } = await createAdminClient().rpc("record_purchase", {
    p_reference: paymentId,
    p_email: user.email || null,
    p_phone: user.email ? null : user.phone || null,
    p_student_name: (profile?.full_name || user.user_metadata?.full_name || "").slice(0, 80) || null,
    p_amount_paise: Number.isInteger(order.amount) ? order.amount : null,
  });
  if (error) {
    console.error("record_purchase failed", paymentId, error.message);
    return NextResponse.json({ verified: true, unlocked: false, error: "Payment received; unlocking is delayed. We'll sort it out, or message us with your payment ID." }, { status: 500 });
  }
  // Paid before filling in their details: the purchase waits (matched to this email) and onboarding claims it.
  if (!profile) return NextResponse.json({ verified: true, unlocked: false, paid: true, next: "/onboarding?next=%2Fcourse", payment_id: paymentId });
  // record_purchase usually unlocks straight away ("claimed"); claim_purchases covers the rest.
  const supabase = await createClient();
  if (status !== "claimed" && status !== "already_claimed") await supabase.rpc("claim_purchases");
  const { data: access } = await supabase.from("course_access").select("course_id").eq("student_id", user.id).eq("course_id", COURSE_ID).maybeSingle();
  if (!access) {
    console.error("paid but not unlocked", paymentId, status);
    return NextResponse.json({ verified: true, unlocked: false, error: "Payment received. Unlocking needs a quick check from us." }, { status: 202 });
  }
  return NextResponse.json({ verified: true, unlocked: true, payment_id: paymentId });
}
