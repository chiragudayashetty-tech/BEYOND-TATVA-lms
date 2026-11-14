import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEmail, indianMobile, isStaffDomain, loginLabel, parseLoginId, passwordProblem } from "../src/lib/login-id.js";

test("phone numbers in every common shape", () => {
  for (const s of ["9845012345", "98450 12345", "+91 98450-12345", "919845012345", "09845012345"]) assert.equal(indianMobile(s), "919845012345");
  for (const s of ["12345", "5845012345", "91984501234", "abc"]) assert.equal(indianMobile(s), null);
});

test("login box: phone or email", () => {
  assert.deepEqual(parseLoginId(" 98450 12345 "), { kind: "phone", phone: "919845012345" });
  assert.deepEqual(parseLoginId("Ravi@Gmail.com"), { kind: "email", email: "ravi@gmail.com" });
  assert.equal(parseLoginId("ravi@"), null);
  assert.equal(parseLoginId(""), null);
  assert.equal(cleanEmail(" A@B.co "), "a@b.co");
  assert.equal(cleanEmail("nope"), null);
});

test("login label shows email and phone", () => {
  assert.equal(loginLabel({ email: "a@b.com", phone: "919845012345" }), "a@b.com or +91 98450 12345");
  assert.equal(loginLabel({ email: "a@b.com" }), "a@b.com");
  assert.equal(loginLabel({ phone: "919845012345" }), "+91 98450 12345");
});

test("staff addresses can't be created with a password", () => {
  assert.equal(isStaffDomain("chirag@beyondtatva.in"), true);
  assert.equal(isStaffDomain("x@team.beyondtatva.in"), true);
  assert.equal(isStaffDomain("x@notbeyondtatva.in"), false);
  assert.equal(isStaffDomain("a@gmail.com"), false);
});

test("password rules", () => {
  assert.match(passwordProblem("short"), /at least 8/);
  assert.match(passwordProblem("12345678"), /easy/);
  assert.match(passwordProblem("aaaaaaaa"), /easy/);
  assert.equal(passwordProblem("udupi2026"), null);
});
