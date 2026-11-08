import { test } from "node:test";
import assert from "node:assert/strict";
import { sheetsKeyValid } from "../src/lib/sheets-key.js";

const secret = "a-long-random-secret-for-tests-123456";
test("accepts only the exact key", () => {
  assert.equal(sheetsKeyValid(secret, secret), true);
  assert.equal(sheetsKeyValid(secret + "x", secret), false);
  assert.equal(sheetsKeyValid("", secret), false);
  assert.equal(sheetsKeyValid(null, secret), false);
});
test("sync is off without a strong secret", () => {
  assert.equal(sheetsKeyValid("short", "short"), false);
  assert.equal(sheetsKeyValid(secret, ""), false);
});
