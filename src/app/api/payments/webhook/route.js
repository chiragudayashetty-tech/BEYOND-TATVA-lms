import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { parseWebhookEvent, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

// Razorpay webhook (Dashboard → Webhooks → https://<lms-domain>/api/payments/webhook).
// Events: payment.captured, order.paid, payment.failed, refund.processed.
// Grants course_access to the account that created the order and revokes it on a full refund.
export async function POST(request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseWebhookEvent(body);
  if (!parsed) return NextResponse.json({ ok: true, outcome: "ignored" });

  // Razorpay retries deliveries with the same event id; fall back to a body hash if the header is missing.
  const eventId = request.headers.get("x-razorpay-event-id") || `sha256:${createHash("sha256").update(raw).digest("hex")}`;
  const { data: outcome, error } = await createAdminClient().rpc("apply_payment_event", {
    p_event_id: eventId,
    p_event: parsed.event,
    p_order_id: parsed.orderId,
    p_payment_id: parsed.paymentId,
    p_amount_paise: parsed.amountPaise,
    p_full_refund: parsed.fullRefund ?? false,
    p_payload: body,
  });
  if (error) {
    console.error("webhook failed", parsed.event, error);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 }); // Razorpay will retry
  }
  if (["unknown_order", "amount_mismatch", "no_student"].includes(outcome)) console.warn("payment needs a look", parsed, outcome);
  return NextResponse.json({ ok: true, outcome });
}
