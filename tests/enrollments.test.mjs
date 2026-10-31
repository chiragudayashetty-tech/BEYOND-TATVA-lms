import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifySignature } from "../src/lib/enrollments.js";

const secret = "shared-secret";
const body = '{"event":"enrollment.paid","reference":"pay_1","email":"kid@gmail.com"}';
const now = 1_800_000_000_000;
const ts = String(now / 1000);
const sign = (t, b, s = secret) => createHmac("sha256", s).update(`${t}.${b}`).digest("hex");

test("accepts a fresh, correctly signed call", () => {
  assert.equal(verifySignature(body, ts, sign(ts, body), secret, now), true);
});

test("rejects tampered body, wrong secret, missing parts", () => {
  assert.equal(verifySignature(body.replace("kid", "evil"), ts, sign(ts, body), secret, now), false);
  assert.equal(verifySignature(body, ts, sign(ts, body, "other"), secret, now), false);
  assert.equal(verifySignature(body, null, sign(ts, body), secret, now), false);
  assert.equal(verifySignature(body, ts, null, secret, now), false);
  assert.equal(verifySignature(body, ts, sign(ts, body), "", now), false);
  assert.equal(verifySignature(body, "12abc", sign("12abc", body), secret, now), false);
});

test("rejects replays older than 5 minutes", () => {
  const old = String(now / 1000 - 301);
  assert.equal(verifySignature(body, old, sign(old, body), secret, now), false);
  const recent = String(now / 1000 - 299);
  assert.equal(verifySignature(body, recent, sign(recent, body), secret, now), true);
});
