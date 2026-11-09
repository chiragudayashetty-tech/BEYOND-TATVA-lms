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
