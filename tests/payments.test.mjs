// Run: npm test   (uses the react-server condition so "server-only" imports resolve outside Next)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { quote, normaliseCoupon } from "../src/lib/payments/pricing.js";
import { parseWebhookEvent, verifyCheckoutSignature, verifyWebhookSignature } from "../src/lib/payments/razorpay.js";

test("price without coupon is the list price in paise", () => {
  assert.deepEqual(quote(999, null), { listPaise: 99900, amountPaise: 99900, discountPaise: 0, percentOff: 0, coupon: null });
});

test("LOKI5 takes 5% off, rounded to the paisa", () => {
  const q = quote(999, { code: "LOKI5", percent_off: 5, active: true, expires_at: null });
  assert.equal(q.amountPaise, 94905);
  assert.equal(q.discountPaise, 4995);
  assert.equal(q.coupon, "LOKI5");
});

test("inactive or expired coupons are ignored", () => {
  assert.equal(quote(999, { code: "X", percent_off: 50, active: false }).amountPaise, 99900);
  assert.equal(quote(999, { code: "X", percent_off: 50, active: true, expires_at: "2020-01-01" }).coupon, null);
});

test("never below Razorpay's ₹1 minimum", () => {
  assert.equal(quote(999, { code: "FREE", percent_off: 100, active: true }).amountPaise, 100);
});

test("coupon input is normalised", () => {
  assert.equal(normaliseCoupon("  loki5 "), "LOKI5");
  assert.equal(normaliseCoupon(undefined), "");
});

test("checkout signature: valid, tampered, missing secret", () => {
  const secret = "test_secret";
  const sig = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
  assert.equal(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: sig }, secret), true);
  assert.equal(verifyCheckoutSignature({ orderId: "order_2", paymentId: "pay_1", signature: sig }, secret), false);
  assert.equal(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: "short" }, secret), false);
  assert.equal(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: sig }, ""), false);
});

test("webhook signature is over the raw body", () => {
  const raw = '{"event":"payment.captured"}';
  const sig = createHmac("sha256", "whsec").update(raw).digest("hex");
  assert.equal(verifyWebhookSignature(raw, sig, "whsec"), true);
  assert.equal(verifyWebhookSignature(raw + " ", sig, "whsec"), false);
  assert.equal(verifyWebhookSignature(raw, null, "whsec"), false);
});

test("webhook events map to apply_payment_event arguments", () => {
  const payment = { id: "pay_1", order_id: "order_1", amount: 99900, amount_refunded: 0 };
  assert.deepEqual(parseWebhookEvent({ event: "payment.captured", payload: { payment: { entity: payment } } }),
    { event: "payment.captured", orderId: "order_1", paymentId: "pay_1", amountPaise: 99900 });
  assert.deepEqual(parseWebhookEvent({ event: "order.paid", payload: { order: { entity: { id: "order_1", amount_paid: 99900 } }, payment: { entity: payment } } }),
    { event: "order.paid", orderId: "order_1", paymentId: "pay_1", amountPaise: 99900 });
  const partial = parseWebhookEvent({ event: "refund.processed", payload: { refund: { entity: { payment_id: "pay_1", amount: 500 } }, payment: { entity: { ...payment, amount_refunded: 500, refund_status: "partial" } } } });
  assert.equal(partial.fullRefund, false);
  const full = parseWebhookEvent({ event: "refund.processed", payload: { refund: { entity: { payment_id: "pay_1", amount: 99900 } }, payment: { entity: { ...payment, amount_refunded: 99900, refund_status: "full" } } } });
  assert.equal(full.fullRefund, true);
  assert.equal(full.paymentId, "pay_1");
  assert.equal(parseWebhookEvent({ event: "refund.processed", payload: { refund: { entity: { payment_id: "pay_1", amount: 99900 } } } }).fullRefund, false);
  assert.equal(parseWebhookEvent({ event: "subscription.charged", payload: {} }), null);
});
