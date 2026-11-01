import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("the per-page session never calls claim_purchases (it slowed every tap)", () => {
  assert.doesNotMatch(src("lib/supabase/server.js"), /claim_purchases/);
});

test("purchases are still claimed at sign-in, after onboarding and on /unlock", () => {
  assert.match(src("app/auth/callback/route.js"), /rpc\("claim_purchases"\)/);
  assert.match(src("app/onboarding/OnboardingForm.js"), /rpc\("claim_purchases"\)/);
  assert.match(src("app/unlock/page.js"), /rpc\("claim_purchases"\)/);
});

test("course content is cached and Studio saves refresh it", () => {
  const data = src("lib/data.js");
  assert.match(data, /unstable_cache\(/);
  assert.match(data, /tags: \[COURSE_TAG\]/);
  assert.match(src("app/admin/actions.js"), /updateTag\(COURSE_TAG\)/);
});

test("every page has an instant loading fallback", () => {
  assert.match(src("app/loading.js"), /export default function Loading/);
});

test("buttons and inputs are at least 44px tall, inputs 16px on phones (no iOS zoom)", () => {
  const css = src("app/globals.css");
  assert.match(css, /@utility btn \{\s*@apply[^;]*min-h-11/);
  assert.match(css, /@utility input \{\s*@apply[^;]*min-h-11[^;]*text-base[^;]*sm:text-sm/);
  assert.match(css, /touch-action: manipulation/);
});
