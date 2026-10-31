import { NextResponse } from "next/server";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { fail, payingStudent, readJson } from "@/lib/payments/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST { razorpay_order_id, razorpay_payment_id, razorpay_signature } from Checkout's success handler.
// Unlocks straight away so the student lands in the course; the webhook does the same and is the backup
// if this request never arrives (closed tab, lost network). Both paths are idempotent.
export async function POST(request) {
  const student = await payingStudent();
  if (student.error) return student.error;
  const body = await readJson(request);
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  if (!verifyCheckoutSignature({ orderId, paymentId, signature: body.razorpay_signature })) {
    return fail(400, "We couldn't confirm that payment. If money left your account, it will unlock within a few minutes, or contact us.");
  }

  const admin = createAdminClient();
  const { data: order } = await admin.from("payment_orders").select("id, student_id").eq("id", orderId).maybeSingle();
  if (!order || order.student_id !== student.user.id) return fail(403, "This payment belongs to a different account.");

  const { data: outcome, error } = await admin.rpc("apply_payment_event", {
    p_event_id: null, p_event: "checkout.verified", p_order_id: orderId, p_payment_id: paymentId, p_amount_paise: null,
  });
  if (error) {
    console.error("verify failed", error);
    return fail(500, "Payment received. Unlocking is taking longer than usual; refresh in a minute.");
  }
  return NextResponse.json({ ok: outcome === "granted", outcome });
}
