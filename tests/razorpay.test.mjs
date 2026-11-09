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
