import { NextResponse } from "next/server";
import { readJson } from "@/lib/body";
import { COURSE_ID } from "@/lib/catalog";
import { captureState, fetchOrder, fetchPayment, paymentSignatureValid, razorpayKeys } from "@/lib/razorpay";
import { recordGuestPurchase, tenDigits, validMobile } from "@/lib/guest-pay";
import { trackServer } from "@/lib/track";

// POST /api/guest-verify { razorpay_order_id, razorpay_payment_id, razorpay_signature } → { paid, phone }
// Checks the signature, reads the phone from OUR order notes (not the browser) and records the purchase on it.
export async function POST(request) {
  const keys = razorpayKeys();
  if (!keys) return NextResponse.json({ error: "Online payments aren't set up yet" }, { status: 500 });
  const { tooBig, body } = await readJson(request);
  if (tooBig) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body || {};
  if (!paymentSignatureValid(orderId, paymentId, signature, keys.secret)) return NextResponse.json({ error: "Payment signature mismatch" }, { status: 400 });

  let order;
  try {
    const r = await fetchOrder(keys, orderId);
    if (!r.ok) throw new Error(`order ${r.status}`);
    order = r.data;
  } catch (e) {
    console.error("razorpay guest order lookup failed", orderId, e.message);
    return NextResponse.json({ paid: true, delayed: true, error: "Payment received; saving it is delayed. Message us with your payment ID." }, { status: 502 });
  }
  const phone = tenDigits(order.notes?.guest_phone);
  if (order.notes?.course !== COURSE_ID || !validMobile(phone)) return NextResponse.json({ error: "This isn't a course payment" }, { status: 400 });
  // Captured for this order? If not yet, the webhook (payment.captured) saves it on this number in a moment.
  let capture = "pending";
  try {
    const p = await fetchPayment(keys, paymentId);
    capture = p.ok ? captureState(p.data, order) : "pending";
  } catch (e) {
    console.error("razorpay guest payment lookup failed", paymentId, e.message);
  }
  if (capture === "bad") return NextResponse.json({ error: "This payment doesn't match the order. Message us with your payment ID." }, { status: 400 });
  if (capture !== "captured") return NextResponse.json({ paid: true, delayed: true, phone, payment_id: paymentId }, { status: 202 });

  const { data: status, error } = await recordGuestPurchase(paymentId, phone, order.amount);
  if (error) {
    console.error("guest record_purchase failed", paymentId, error.message);
    return NextResponse.json({ paid: true, delayed: true, error: "Payment received; saving it is delayed. Message us with your payment ID." }, { status: 500 });
  }
  if (status === "claimed" || status === "pending") await trackServer("payment_completed", `guest:${orderId}`, { amount_inr: Number.isInteger(order.amount) ? order.amount / 100 : null, coupon: order.notes?.coupon || null, via: "guest" });
  return NextResponse.json({ paid: true, phone, payment_id: paymentId });
}
