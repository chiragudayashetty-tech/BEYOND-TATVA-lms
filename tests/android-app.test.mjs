import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { ANDROID_PACKAGE, assetLinks, inAppScript } from "../src/lib/android-app.js";

const FP = Array(32).fill("AB").join(":");

test("asset links list only well-formed fingerprints", () => {
  assert.deepEqual(assetLinks(""), []);
  assert.deepEqual(assetLinks("not-a-fingerprint"), []);
  const [link] = assetLinks(` ${FP.toLowerCase()} , junk`);
  assert.equal(link.target.package_name, ANDROID_PACKAGE);
  assert.deepEqual(link.target.sha256_cert_fingerprints, [FP]);
  assert.deepEqual(link.relation, ["delegate_permission/common.handle_all_urls"]);
});

// Runs the <head> script against a fake page and reports whether it marked the page as "in the app".
function run({ referrer = "", search = "", stored = {} }) {
  const classes = new Set();
  const store = { ...stored };
  vm.runInNewContext(inAppScript, {
    document: { referrer, documentElement: { classList: { add: (c) => classes.add(c) } } },
    location: { search },
    sessionStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
  });
  return classes.has("in-app");
}

test("only our own Play Store app hides payments", () => {
  assert.equal(run({ referrer: `android-app://${ANDROID_PACKAGE}/` }), true);
  assert.equal(run({ search: "?app=android" }), true);
  assert.equal(run({ stored: { "bt-app": "1" } }), true); // later pages in the same app tab
  // Links opened from WhatsApp, Instagram or Google must keep the pay page.
  assert.equal(run({ referrer: "android-app://com.whatsapp/" }), false);
  assert.equal(run({ referrer: "https://www.beyondtatva.in/" }), false);
  assert.equal(run({ search: "?app=androidx" }), false);
  assert.equal(run({}), false);
});
