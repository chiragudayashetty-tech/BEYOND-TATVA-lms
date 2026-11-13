import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { bunnyMp4Url, offlineQualities } from "../src/lib/bunny.js";
import { parseVideo, tracksProgress } from "../src/lib/video.js";

const id = "2c87255e-a97c-4a30-9c71-9fb37b11b2b8";

test("offline qualities start at the wanted one and only go down", () => {
  assert.deepEqual(offlineQualities(undefined), [720, 480, 360]);
  assert.deepEqual(offlineQualities("480"), [480, 360]);
  assert.deepEqual(offlineQualities("1080"), [720, 480, 360]);
});

test("Bunny MP4 link, unsigned when there is no key", () => {
  assert.equal(bunnyMp4Url({ host: "vz-abc-123.b-cdn.net", videoId: id, quality: 720 }), `https://vz-abc-123.b-cdn.net/${id}/play_720p.mp4`);
  assert.equal(bunnyMp4Url({ host: "https://VZ-abc-123.b-cdn.net/", videoId: id, quality: 360 }), `https://vz-abc-123.b-cdn.net/${id}/play_360p.mp4`);
});

test("Bunny MP4 link is signed with the pull zone key and expires", () => {
  const now = 1_800_000_000_000;
  const url = new URL(bunnyMp4Url({ host: "vz-abc-123.b-cdn.net", videoId: id, quality: 720, key: "secret", now, ttlSeconds: 3600 }));
  const expires = "1800003600";
  assert.equal(url.searchParams.get("expires"), expires);
  const want = createHash("sha256").update(`secret/${id}/play_720p.mp4${expires}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(url.searchParams.get("token"), want);
  assert.doesNotMatch(url.toString(), /secret/);
});

test("Bunny MP4 link refuses hosts and ids that could point somewhere else", () => {
  for (const host of ["", "evil.com/x", "a b.com", "localhost", "vz.b-cdn.net@evil.com", "vz.b-cdn.net?x="]) assert.equal(bunnyMp4Url({ host, videoId: id, quality: 720 }), null, host);
  for (const videoId of ["", "../secret", "abc/def", "x?y"]) assert.equal(bunnyMp4Url({ host: "vz-a.b-cdn.net", videoId, quality: 720 }), null, videoId);
  assert.equal(bunnyMp4Url({ host: "vz-a.b-cdn.net", videoId: id, quality: 1080 }), null);
});

test("a lesson saved on the device plays in our own player and tracks progress", () => {
  const v = parseVideo("blob:https://learn.beyondtatva.in/1b2c");
  assert.deepEqual(v, { kind: "file", src: "blob:https://learn.beyondtatva.in/1b2c" });
  assert.equal(tracksProgress(v), true);
});
