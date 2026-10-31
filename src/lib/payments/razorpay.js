import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Thin Razorpay client (no SDK): order creation and signature checks.
// Keys live in env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const base = process.env.RAZORPAY_API_URL || "https://api.razorpay.com"; // override only for local tests
  const res = await fetch(`${base}/v1/orders`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) throw new Error(body?.error?.description || `Razorpay order failed (${res.status})`);
  return body;
}

export function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

const hmac = (secret, data) => createHmac("sha256", secret).update(data).digest("hex");

// Checkout success handler: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret).
export function verifyCheckoutSignature({ orderId, paymentId, signature }, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!secret || !orderId || !paymentId) return false;
  return safeEqualHex(hmac(secret, `${orderId}|${paymentId}`), signature);
}

// Webhooks: X-Razorpay-Signature = HMAC_SHA256(raw request body, webhook secret).
export function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret) return false;
  return safeEqualHex(hmac(secret, rawBody), signature);
}

// Turns a webhook payload into the arguments of public.apply_payment_event, or null if we don't act on it.
export function parseWebhookEvent(body) {
  const event = body?.event;
  const payment = body?.payload?.payment?.entity;
  const order = body?.payload?.order?.entity;
  const refund = body?.payload?.refund?.entity;
  switch (event) {
    case "payment.captured":
      return { event, orderId: payment?.order_id ?? null, paymentId: payment?.id ?? null, amountPaise: payment?.amount ?? null };
    case "order.paid":
      return { event, orderId: order?.id ?? payment?.order_id ?? null, paymentId: payment?.id ?? null, amountPaise: order?.amount_paid ?? payment?.amount ?? null };
    case "payment.failed":
      return { event, orderId: payment?.order_id ?? null, paymentId: payment?.id ?? null, amountPaise: null };
    case "refund.processed":
    case "payment.refunded": {
      const paymentId = payment?.id ?? refund?.payment_id ?? null;
      const refunded = payment?.amount_refunded ?? refund?.amount ?? 0;
      const full = payment?.refund_status === "full" || (payment?.amount != null && refunded >= payment.amount);
      return { event, orderId: payment?.order_id ?? null, paymentId, amountPaise: refunded, fullRefund: Boolean(full) };
    }
    default:
      return null;
  }
}
