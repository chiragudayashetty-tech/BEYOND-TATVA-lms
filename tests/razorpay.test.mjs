import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { paymentSignatureValid } from "../src/lib/razorpay.js";

const secret = "test_secret";
const sig = (o, p, s = secret) => createHmac("sha256", s).update(`${o}|${p}`).digest("hex");

test("accepts Razorpay's signature for order|payment", () => {
  assert.equal(paymentSignatureValid("order_1", "pay_1", sig("order_1", "pay_1"), secret), true);
});

test("rejects swapped ids, wrong secret and missing fields", () => {
  assert.equal(paymentSignatureValid("order_2", "pay_1", sig("order_1", "pay_1"), secret), false);
  assert.equal(paymentSignatureValid("order_1", "pay_1", sig("order_1", "pay_1", "other"), secret), false);
  assert.equal(paymentSignatureValid("order_1", "pay_1", "", secret), false);
  assert.equal(paymentSignatureValid("order_1", "pay_1", "short", secret), false);
});

import { webhookSignatureValid, parseWebhookEvent } from "../src/lib/razorpay.js";
import { readLimited } from "../src/lib/body.js";

test("webhook signature is HMAC of the raw body", () => {
  const raw = '{"event":"payment.captured"}';
  const good = createHmac("sha256", "wh").update(raw).digest("hex");
  assert.equal(webhookSignatureValid(raw, good, "wh"), true);
  assert.equal(webhookSignatureValid(raw + " ", good, "wh"), false);
  assert.equal(webhookSignatureValid(raw, good, ""), false);
});

test("parses captured payments and full vs partial refunds", () => {
  const pay = { id: "pay_1", order_id: "order_1", amount: 99900, amount_refunded: 0 };
  assert.deepEqual(parseWebhookEvent({ event: "payment.captured", payload: { payment: { entity: pay } } }),
    { kind: "paid", orderId: "order_1", paymentId: "pay_1", amount: 99900 });
  const refund = (refunded) => parseWebhookEvent({ event: "refund.processed",
    payload: { refund: { entity: { payment_id: "pay_1" } }, payment: { entity: { ...pay, amount_refunded: refunded } } } });
  assert.equal(refund(99900).full, true);
  assert.equal(refund(500).full, false);
  assert.equal(parseWebhookEvent({ event: "payment.authorized", payload: { payment: { entity: pay } } }), null);
});

test("body limit refuses big requests", async () => {
  const req = (s) => new Request("http://x", { method: "POST", body: s });
  assert.equal(await readLimited(req("x".repeat(20)), 10), null);
  assert.equal(await readLimited(req("hello"), 10), "hello");
});
