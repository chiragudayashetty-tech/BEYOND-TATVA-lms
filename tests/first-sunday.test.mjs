import { test } from "node:test";
import assert from "node:assert/strict";
import { nextFirstSunday } from "../src/lib/first-sunday.js";

const d = (s) => nextFirstSunday(new Date(s)).toDateString();

test("finds the first Sunday of this month or the next", () => {
  assert.equal(d("2026-11-01T10:00"), new Date("2026-11-01T00:00").toDateString()); // Nov 1 2026 is a Sunday
  assert.equal(d("2026-11-06T10:00"), new Date("2026-12-06T00:00").toDateString());
  assert.equal(d("2026-12-31T10:00"), new Date("2027-01-03T00:00").toDateString());
});
