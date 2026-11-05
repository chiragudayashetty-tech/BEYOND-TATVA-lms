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
