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

import { readLimited } from "../src/lib/body.js";

test("body limit refuses big requests", async () => {
  const req = (s) => new Request("http://x", { method: "POST", body: s });
  assert.equal(await readLimited(req("x".repeat(20)), 10), null);
  assert.equal(await readLimited(req("hello"), 10), "hello");
});

import { refundPlan } from "../src/lib/razorpay.js";

test("refund plan: refunds what is left of a captured payment", () => {
  assert.deepEqual(refundPlan({ id: "pay_1", status: "captured", amount: 49900, amount_refunded: 0 }), { action: "refund", amount: 49900 });
  assert.deepEqual(refundPlan({ id: "pay_1", status: "refunded", amount: 49900, amount_refunded: 10000 }), { action: "refund", amount: 39900 });
});

test("refund plan: already full refund just removes access; uncaptured or missing is an error", () => {
  assert.deepEqual(refundPlan({ id: "pay_1", status: "refunded", amount: 100, amount_refunded: 100, refund_status: "full" }), { action: "done" });
  assert.ok(refundPlan({ id: "pay_1", status: "failed", amount: 100 }).error);
  assert.ok(refundPlan({}).error);
});
