import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { otpTemplateMessage, verifyHookSignature, whatsappNumber } from "../src/lib/whatsapp-otp.js";

const keyB64 = Buffer.from("test-hook-key-32-bytes-long!!!!!").toString("base64");
const secret = `v1,whsec_${keyB64}`;
const now = 1_800_000_000_000;
const ts = String(now / 1000);
const body = '{"user":{"phone":"919845012345"},"sms":{"otp":"123456"}}';
const sign = (b, t = ts, k = keyB64) => "v1," + createHmac("sha256", Buffer.from(k, "base64")).update(`msg_1.${t}.${b}`).digest("base64");
const h = (sig, t = ts) => ({ "webhook-id": "msg_1", "webhook-timestamp": t, "webhook-signature": sig });

test("accepts Supabase's Standard Webhooks signature", () => {
  assert.equal(verifyHookSignature(body, h(sign(body)), secret, now), true);
  assert.equal(verifyHookSignature(body, h(`v1,bogus ${sign(body)}`), secret, now), true);
});

test("rejects tampered body, wrong key, stale timestamp, missing headers", () => {
  assert.equal(verifyHookSignature(body.replace("123456", "000000"), h(sign(body)), secret, now), false);
  assert.equal(verifyHookSignature(body, h(sign(body, ts, Buffer.from("other").toString("base64"))), secret, now), false);
  const old = String(now / 1000 - 600);
  assert.equal(verifyHookSignature(body, h(sign(body, old), old), secret, now), false);
  assert.equal(verifyHookSignature(body, {}, secret, now), false);
  assert.equal(verifyHookSignature(body, h(sign(body)), "", now), false);
});

test("normalises Indian mobiles for WhatsApp", () => {
  assert.equal(whatsappNumber("+919845012345"), "919845012345");
  assert.equal(whatsappNumber("9845012345"), "919845012345");
  assert.equal(whatsappNumber("12345"), null);
  assert.equal(whatsappNumber("+15551234567"), null);
  assert.equal(whatsappNumber("915845012345"), null);
});

test("builds an authentication template with the code in body and button", () => {
  const m = otpTemplateMessage("919845012345", "123456");
  assert.equal(m.template.name, "login_code");
  assert.equal(m.template.components[0].parameters[0].text, "123456");
  assert.equal(m.template.components[1].parameters[0].text, "123456");
});
