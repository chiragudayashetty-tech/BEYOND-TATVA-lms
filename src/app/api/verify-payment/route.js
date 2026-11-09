import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getSession } from "@/lib/supabase/server";
import { COURSE_ID } from "@/lib/catalog";
import { paymentSignatureValid, razorpayKeys } from "@/lib/razorpay";
import { readJson } from "@/lib/body";

// POST /api/verify-payment { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Checkout callback. Unlocks only when the signature matches AND create-order saved this order for this account.
// settle_payment is the same idempotent path the Razorpay webhook uses, so whichever arrives first wins and the
// other is a no-op. The webhook still unlocks if the student closes the tab before this runs.
export async function POST(request) {
  const { user, profile } = await getSession();
  if (!user || (profile && profile.role !== "student")) return NextResponse.json({ error: "Sign in as a student first" }, { status: 401 });
  const keys = razorpayKeys();
  if (!keys) return NextResponse.json({ error: "Online payments aren't set up yet" }, { status: 500 });

  const { tooBig, body } = await readJson(request);
  if (tooBig) return NextResponse.json({ verified: false, error: "Request too large" }, { status: 413 });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body || {};
  if (!orderId || !paymentId || !signature) return NextResponse.json({ verified: false, error: "Missing payment details" }, { status: 400 });
  if (!paymentSignatureValid(orderId, paymentId, signature, keys.secret)) {
    return NextResponse.json({ verified: false, error: "Payment signature mismatch" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin.from("payment_orders").select("user_id, course_id").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id || order.course_id !== COURSE_ID) {
    return NextResponse.json({ verified: false, error: "This payment belongs to a different account" }, { status: 400 });
  }

  const { data: status, error } = await admin.rpc("settle_payment", { p_order_id: orderId, p_payment_id: paymentId, p_amount_paise: null });
  if (error || !["claimed", "already_claimed", "pending"].includes(status)) {
    console.error("settle_payment failed", orderId, paymentId, error?.message || status);
    return NextResponse.json({ verified: true, unlocked: false, error: "Payment received; unlocking is delayed. We'll sort it out, or message us with your payment ID." }, { status: 500 });
  }
  // Paid before filling in their details: the purchase waits (matched to this login) and onboarding claims it.
  if (!profile) return NextResponse.json({ verified: true, unlocked: false, paid: true, next: "/onboarding?next=%2Fcourse", payment_id: paymentId });
  const supabase = await createClient();
  if (status === "pending") await supabase.rpc("claim_purchases");
  const { data: access } = await supabase.from("course_access").select("course_id").eq("student_id", user.id).eq("course_id", COURSE_ID).maybeSingle();
  if (!access) {
    console.error("paid but not unlocked", paymentId, status);
    return NextResponse.json({ verified: true, unlocked: false, error: "Payment received. Unlocking needs a quick check from us." }, { status: 202 });
  }
  return NextResponse.json({ verified: true, unlocked: true, payment_id: paymentId });
}
