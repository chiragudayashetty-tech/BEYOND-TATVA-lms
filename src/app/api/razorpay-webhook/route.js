import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COURSE_ID } from "@/lib/catalog";
import { fullRefundPaymentId, webhookSignatureValid } from "@/lib/razorpay";
import { readLimited } from "@/lib/body";

// POST /api/razorpay-webhook: Razorpay calls this on payment.captured / order.paid, even if the parent closed
// the browser or lost signal after paying. Records the purchase for the student in the order notes.
// Safe to receive many times: record_purchase uses the payment id as reference, so a payment counts once.
// Razorpay → Settings → Webhooks → URL https://learn.beyondtatva.in/api/razorpay-webhook,
// events payment.captured + order.paid + refund.processed, secret = RAZORPAY_WEBHOOK_SECRET in Vercel.
export async function POST(request) {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  if (!secret) return NextResponse.json({ error: "webhook not set up" }, { status: 500 });
  const raw = await readLimited(request, 100_000);
  if (raw === null) return NextResponse.json({ error: "too large" }, { status: 413 });
  if (!webhookSignatureValid(raw, request.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  // A full refund made in the Razorpay dashboard ends access (same as Studio → Enrollments → Refunded).
  // Partial refunds keep access. Only our LMS payments: the reference is the Razorpay payment id.
  if (event.event === "refund.processed" || event.event === "payment.refunded") {
    const refundedId = fullRefundPaymentId(event);
    if (!refundedId) return NextResponse.json({ ignored: true, reason: "partial refund" });
    const { data: outcome, error } = await createAdminClient().rpc("revoke_purchase", { p_reference: refundedId });
    if (error) {
      console.error("razorpay webhook: revoke_purchase failed", refundedId, error.message);
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: outcome });
  }
  if (event.event !== "payment.captured" && event.event !== "order.paid") return NextResponse.json({ ignored: true });

  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;
  const notes = { ...(payment?.notes || {}), ...(order?.notes || {}) };
  if (!payment?.id || payment.status !== "captured") return NextResponse.json({ ignored: true });
  // Only our LMS orders: they carry the student id and course in the notes (create-order).
  if (notes.source !== "lms" || notes.course !== COURSE_ID || !notes.student_id) return NextResponse.json({ ignored: true });

  const admin = createAdminClient();
  const { data: found, error: userError } = await admin.auth.admin.getUserById(String(notes.student_id));
  if (userError || !found?.user) {
    console.error("razorpay webhook: student not found", payment.id);
    return NextResponse.json({ error: "student not found" }, { status: 200 }); // retrying won't help; Studio → Reconcile
  }
  const user = found.user;
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { data: status, error } = await admin.rpc("record_purchase", {
    p_reference: payment.id,
    p_email: user.email || null,
    p_phone: user.email ? null : user.phone || null,
    p_student_name: (profile?.full_name || user.user_metadata?.full_name || "").slice(0, 80) || null,
    p_amount_paise: Number.isInteger(payment.amount) ? payment.amount : null,
  });
  if (error) {
    console.error("razorpay webhook: record_purchase failed", payment.id, error.message);
    return NextResponse.json({ error: "retry" }, { status: 500 }); // Razorpay retries
  }
  return NextResponse.json({ ok: true, status });
}
