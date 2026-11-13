import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { bunnyDownloadUrl } from "../src/lib/bunny-download.js";

const id = "a1b2c3d4-0000-1111-2222-333344445555";
test("plain link without a token key", () => {
  assert.equal(bunnyDownloadUrl(id, { host: "vz-abc.b-cdn.net" }), `https://vz-abc.b-cdn.net/${id}/play_720p.mp4`);
});
test("signed link matches Bunny's token formula", () => {
  const now = 1_700_000_000_000;
  const u = new URL(bunnyDownloadUrl(id, { host: "vz-abc.b-cdn.net", tokenKey: "k", now }));
  const exp = 1_700_000_000 + 3600;
  const want = createHash("sha256").update(`k/${id}/play_720p.mp4${exp}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(u.searchParams.get("token"), want);
  assert.equal(u.searchParams.get("expires"), String(exp));
});
test("rejects bad host or id", () => {
  assert.equal(bunnyDownloadUrl(id, { host: "evil.com" }), null);
  assert.equal(bunnyDownloadUrl("../x", { host: "vz-abc.b-cdn.net" }), null);
  assert.equal(bunnyDownloadUrl(id, {}), null);
});
