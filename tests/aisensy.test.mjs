import { test } from "node:test";
import assert from "node:assert/strict";
import { aisensyPayload } from "../src/lib/aisensy.js";

test("AiSensy OTP payload carries the code in the body and the copy-code button", () => {
  const p = aisensyPayload({ apiKey: "k", campaign: "login_otp", to: "919845012345", name: "Student", params: ["123456"], buttonCode: "123456" });
  assert.equal(p.campaignName, "login_otp");
  assert.equal(p.destination, "919845012345");
  assert.deepEqual(p.templateParams, ["123456"]);
  assert.equal(p.buttons[0].parameters[0].text, "123456");
});

test("AiSensy message without a button has no buttons field and string params", () => {
  const p = aisensyPayload({ apiKey: "k", campaign: "paid", to: "919845012345", params: ["Asha", 499] });
  assert.equal(p.buttons, undefined);
  assert.deepEqual(p.templateParams, ["Asha", "499"]);
  assert.equal(p.userName, "Parent");
});
