import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWebhookEvent, webhookSignatureValid } from "@/lib/razorpay";
import { readLimited } from "@/lib/body";

// Razorpay → LMS. Dashboard → Webhooks → https://learn.beyondtatva.in/api/razorpay-webhook
// Events: payment.captured, order.paid, refund.processed. Secret: RAZORPAY_WEBHOOK_SECRET (Vercel, server only).
// Unlocks even if the student closed the tab before /api/verify-payment ran. Each x-razorpay-event-id counts once.
export async function POST(request) {
  const raw = await readLimited(request, 100_000);
  if (raw === null) return NextResponse.json({ error: "too large" }, { status: 413 });
  if (!webhookSignatureValid(raw, request.headers.get("x-razorpay-signature"), process.env.RAZORPAY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId) return NextResponse.json({ error: "missing event id" }, { status: 400 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const ev = parseWebhookEvent(body);
  if (!ev) return NextResponse.json({ ok: true, status: "ignored" });

  const db = createAdminClient();
  const { data, error } = ev.kind === "paid"
    ? await db.rpc("settle_payment", { p_order_id: ev.orderId, p_payment_id: ev.paymentId, p_amount_paise: ev.amount, p_event_id: eventId })
    : await db.rpc("refund_payment", { p_payment_id: ev.paymentId, p_full: ev.full, p_event_id: eventId });
  if (error) {
    // 500 makes Razorpay retry; the event id was not stored because the transaction failed.
    console.error("razorpay webhook failed", body.event, eventId, error.message);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 });
  }
  if (["unknown_order", "amount_mismatch", "second_payment"].includes(data)) console.error("razorpay webhook needs a look", body.event, eventId, data);
  return NextResponse.json({ ok: true, status: data });
}
