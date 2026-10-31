import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVideo, tracksProgress } from "../src/lib/video.js";

test("YouTube link shapes", () => {
  for (const u of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=2",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "  https://youtu.be/dQw4w9WgXcQ  ",
  ]) assert.deepEqual(parseVideo(u), { kind: "youtube", id: "dQw4w9WgXcQ", start: 0 }, u);
  assert.equal(parseVideo("https://youtu.be/dQw4w9WgXcQ?t=90").start, 90);
  assert.equal(parseVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s").start, 90);
  assert.equal(parseVideo("https://www.youtube.com/watch?v=short"), null);
  assert.equal(parseVideo("https://www.youtube.com/@beyondtatva"), null);
});

test("Google Drive link shapes", () => {
  const embed = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview";
  for (const u of [
    "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing",
    "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview",
    "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp",
    "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOp&export=download",
  ]) assert.equal(parseVideo(u)?.embed, embed, u);
  assert.equal(parseVideo("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp"), null);
});

test("Vimeo and Bunny Stream", () => {
  assert.equal(parseVideo("https://vimeo.com/76979871").embed, "https://player.vimeo.com/video/76979871");
  assert.equal(parseVideo("https://vimeo.com/76979871/abc123def").embed, "https://player.vimeo.com/video/76979871?h=abc123def");
  assert.equal(parseVideo("https://player.vimeo.com/video/76979871?h=ff00").embed, "https://player.vimeo.com/video/76979871?h=ff00");
  const b = parseVideo("https://iframe.mediadelivery.net/play/12345/0a1b2c3d-guid?token=t0k&expires=1700000000");
  assert.equal(b.kind, "bunny");
  assert.equal(b.embed, "https://iframe.mediadelivery.net/embed/12345/0a1b2c3d-guid?token=t0k&expires=1700000000&preload=true&responsive=true");
});

test("direct files and local media", () => {
  assert.deepEqual(parseVideo("/media/lesson1.mp4"), { kind: "file", src: "/media/lesson1.mp4" });
  assert.equal(parseVideo("https://cdn.example.com/a/b/lesson.MP4?x=1").kind, "file");
  assert.equal(parseVideo("https://example.com/video.webm").kind, "file");
});

test("rejects things that won't play", () => {
  for (const u of ["", null, undefined, "not a url", "javascript:alert(1)", "ftp://x.com/a.mp4", "//evil.com/a.mp4",
    "https://example.com/page", "https://www.instagram.com/reel/abc/", "/media/notes.pdf"]) {
    assert.equal(parseVideo(u), null, String(u));
  }
});

test("only file and YouTube players report watch time", () => {
  assert.equal(tracksProgress(parseVideo("/media/lesson1.mp4")), true);
  assert.equal(tracksProgress(parseVideo("https://youtu.be/dQw4w9WgXcQ")), true);
  assert.equal(tracksProgress(parseVideo("https://vimeo.com/76979871")), false);
  assert.equal(tracksProgress(null), false);
});
