import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { safeNext } from "../src/lib/safe-next.js";

test("keeps same-site paths with query and hash", () => {
  assert.equal(safeNext("/course"), "/course");
  assert.equal(safeNext("/watch/abc?t=10#q"), "/watch/abc?t=10#q");
  assert.equal(safeNext("/unlock?src=qr"), "/unlock?src=qr");
});

test("blocks every off-site trick", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "\\\\evil.com", "https://evil.com", "javascript:alert(1)",
    "evil.com", "/\tevil", "/\n/evil.com", " /course", "", null, undefined, 42, "/" + "a".repeat(3000)]) {
    assert.equal(safeNext(bad), "/dashboard", String(bad));
  }
});

test("custom fallback", () => {
  assert.equal(safeNext("//x", null), null);
  assert.equal(safeNext("/a", null), "/a");
});

test("login, onboarding, proxy, callback and session all use safeNext", () => {
  for (const f of ["app/login/page.js", "app/onboarding/page.js", "proxy.js", "app/auth/callback/route.js", "lib/supabase/server.js"]) {
    const s = readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.match(s, /safeNext\(/, f);
    assert.doesNotMatch(s, /startsWith\("\/\/"\)/, f);
  }
});
