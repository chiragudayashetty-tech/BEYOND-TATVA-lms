import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { webhookSignatureValid } from "../src/lib/razorpay.js";

test("webhook signature: right secret passes, tampered body or wrong secret fails", () => {
  const raw = JSON.stringify({ event: "payment.captured" });
  const sig = createHmac("sha256", "s3cret").update(raw).digest("hex");
  assert.equal(webhookSignatureValid(raw, sig, "s3cret"), true);
  assert.equal(webhookSignatureValid(raw + " ", sig, "s3cret"), false);
  assert.equal(webhookSignatureValid(raw, sig, "other"), false);
  assert.equal(webhookSignatureValid(raw, null, "s3cret"), false);
});

import { fullRefundPaymentId } from "../src/lib/razorpay.js";
const refundEvent = (payment, name = "refund.processed") => ({ event: name, payload: { payment: { entity: payment }, refund: { entity: { payment_id: payment.id } } } });

test("refund webhook: only a full refund revokes access", () => {
  assert.equal(fullRefundPaymentId(refundEvent({ id: "pay_1", amount: 99900, amount_refunded: 99900 })), "pay_1");
  assert.equal(fullRefundPaymentId(refundEvent({ id: "pay_1", amount: 99900, amount_refunded: 0, refund_status: "full" })), "pay_1");
  assert.equal(fullRefundPaymentId(refundEvent({ id: "pay_1", amount: 99900, amount_refunded: 50000, refund_status: "partial" })), null);
  assert.equal(fullRefundPaymentId(refundEvent({ id: "pay_1", amount: 99900, amount_refunded: 99900 }, "payment.captured")), null);
  assert.equal(fullRefundPaymentId(refundEvent({ id: "pay_1", amount: 0, amount_refunded: 0 })), null);
  assert.equal(fullRefundPaymentId({ event: "refund.processed" }), null);
});
