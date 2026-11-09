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


// Razorpay webhooks: X-Razorpay-Signature = HMAC-SHA256(raw body, RAZORPAY_WEBHOOK_SECRET), hex.
export function webhookSignatureValid(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Turns a webhook payload into what settle_payment / refund_payment need, or null for events we ignore.
export function parseWebhookEvent(body) {
  const pay = body?.payload?.payment?.entity;
  if (["payment.captured", "order.paid"].includes(body?.event)) {
    if (!pay?.id || !pay?.order_id) return null;
    return { kind: "paid", orderId: pay.order_id, paymentId: pay.id, amount: Number.isInteger(pay.amount) ? pay.amount : null };
  }
  if (["refund.processed", "payment.refunded"].includes(body?.event)) {
    const refund = body?.payload?.refund?.entity;
    const paymentId = refund?.payment_id || pay?.id;
    if (!paymentId) return null;
    const full = pay ? Number.isInteger(pay.amount) && pay.amount_refunded >= pay.amount : false;
    return { kind: "refund", paymentId, full };
  }
  return null;
}
