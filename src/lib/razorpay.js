import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay Standard Checkout helpers (server only). Keys come from the environment, never the repo.
// Plain fetch to the Orders API: no extra npm dependency.

export function razorpayKeys() {
  const id = (process.env.RAZORPAY_KEY_ID || "").trim();
  const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  return id && secret ? { id, secret } : null;
}

// HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET), compared in constant time.
export function paymentSignatureValid(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

async function call(keys, method, path, body) {
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${keys.id}:${keys.secret}`).toString("base64") },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, data };
}

export const createOrder = (keys, payload) => call(keys, "POST", "/orders", payload);
export const fetchOrder = (keys, orderId) => call(keys, "GET", `/orders/${encodeURIComponent(orderId)}`);


// Webhook: HMAC-SHA256(raw body, WEBHOOK_SECRET) in the x-razorpay-signature header, compared in constant time.
export function webhookSignatureValid(raw, signature, secret) {
  if (!raw || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Webhook refund events (refund.processed / payment.refunded). Returns the payment id to revoke when the
// payment is now fully refunded, else null. Partial refunds keep access (Chirag decides in Studio).
export function fullRefundPaymentId(event) {
  if (event?.event !== "refund.processed" && event?.event !== "payment.refunded") return null;
  const payment = event.payload?.payment?.entity;
  const id = payment?.id || event.payload?.refund?.entity?.payment_id;
  if (!id || !Number.isInteger(payment?.amount) || payment.amount <= 0) return null;
  const refunded = Number.isInteger(payment.amount_refunded) ? payment.amount_refunded : 0;
  return payment.refund_status === "full" || refunded >= payment.amount ? id : null;
}

export const fetchPayment = (keys, paymentId) => call(keys, "GET", `/payments/${encodeURIComponent(paymentId)}`);
export const refundPayment = (keys, paymentId, amount, notes) =>
  call(keys, "POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount, speed: "normal", notes });

// What a Studio refund should do for this Razorpay payment: "refund" the rest, "done" (already fully
// refunded, just remove access) or an error. Only captured payments can be refunded.
export function refundPlan(payment) {
  if (!payment?.id || !Number.isInteger(payment.amount) || payment.amount <= 0) return { error: "Razorpay didn't return this payment." };
  const refunded = Number.isInteger(payment.amount_refunded) ? payment.amount_refunded : 0;
  if (payment.refund_status === "full" || refunded >= payment.amount) return { action: "done" };
  if (payment.status !== "captured" && payment.status !== "refunded") return { error: `This payment is "${payment.status}", not captured, so there is nothing to refund.` };
  return { action: "refund", amount: payment.amount - refunded };
}
