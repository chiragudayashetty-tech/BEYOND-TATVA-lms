import { test } from "node:test";
import assert from "node:assert/strict";
import { describeRule, isoToIst, istToIso, joinDelay, splitDelay } from "../src/lib/custom-rules.js";

test("delays go back and forth between minutes and the unit shown in the form", () => {
  assert.deepEqual(splitDelay(0), { amount: 0, unit: "minutes" });
  assert.deepEqual(splitDelay(90), { amount: 90, unit: "minutes" });
  assert.deepEqual(splitDelay(120), { amount: 2, unit: "hours" });
  assert.deepEqual(splitDelay(2880), { amount: 2, unit: "days" });
  assert.equal(joinDelay(2, "days"), 2880);
  assert.equal(joinDelay("3", "hours"), 180);
  assert.equal(joinDelay(-5, "days"), 0);
  assert.equal(joinDelay(9999, "days"), 525600);
});

test("date and time inputs are India time", () => {
  assert.equal(istToIso("2026-12-01T18:30"), "2026-12-01T18:30:00+05:30");
  assert.equal(istToIso("junk"), null);
  assert.equal(isoToIst("2026-12-01T13:00:00Z"), "2026-12-01T18:30");
  assert.equal(isoToIst(null), "");
});

test("a rule reads as one plain sentence", () => {
  const s = describeRule({ trigger: "signup", delay_minutes: 2880, recipient: "parent", aud_stage: "not_enrolled", aud_grade: 9, from_hour: 9, to_hour: 21 });
  assert.equal(s, "Parent: 2 days after someone signs up (not enrolled yet, Class 9), sent 9am–9pm.");
  assert.match(describeRule({ trigger: "module_open", delay_minutes: 0, recipient: "student", aud_module: 3, from_hour: 18, to_hour: 21 }), /^Student: right after Module 3 opens for a student, sent 6pm–9pm\.$/);
  assert.match(describeRule({ trigger: "date", run_at: "2026-12-01T13:00:00Z", recipient: "parent", from_hour: 9, to_hour: 21 }, ""), /^Parent: on 1 Dec 2026/);
});
