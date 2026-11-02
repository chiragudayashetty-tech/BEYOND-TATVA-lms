import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/app/profile/ProfileEditor.js", import.meta.url), "utf8");

test("profile editor saves only name and avatar of the signed-in user", () => {
  assert.match(src, /update\(\{ full_name: name\.trim\(\), avatar: color \}\)\.eq\("id", userId\)/);
  assert.doesNotMatch(src, /PROFILE_EDIT_READY/);
});

test("display name rule", () => {
  const re = /^[\p{L}\p{M} .'-]+$/u;
  for (const ok of ["Ananya Rao", "D'Souza", "K. Shetty", "Anne-Marie", "ಅನನ್ಯ"]) assert.ok(re.test(ok), ok);
  for (const bad of ["<script>", "a1", "x@y"]) assert.ok(!re.test(bad), bad);
});
