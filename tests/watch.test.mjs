import { test } from "node:test";
import assert from "node:assert/strict";
import { trackSeen } from "../src/lib/watch.js";

// Real playback: the player reports every `every` seconds of video, in real time.
const play = (t, from, to, every = 0.5, t0 = 0) => { const out = []; for (let s = from; s <= to; s += every) out.push(...trackSeen(t, s, t0 + (s - from) * 1000)); return out; };
const fresh = () => ({ last: null, lastAt: null, seen: new Set() });
const sorted = (t) => [...t.seen].sort((a, b) => a - b);

test("normal playback marks every part played", () => {
  const t = fresh(); play(t, 0, 25);
  assert.deepEqual(sorted(t), [0, 1, 2]);
});

test("a player that reports only every 5 s (Bunny, background tab) still counts", () => {
  const t = fresh(); play(t, 0, 60, 5);
  assert.equal(t.seen.size, 7);
});

test("2× speed counts", () => {
  const t = fresh();
  for (let s = 0; s <= 40; s += 2) trackSeen(t, s, s * 500);
  assert.deepEqual(sorted(t), [0, 1, 2, 3, 4]);
});

test("a seek to the end marks nothing in between", () => {
  const t = fresh(); play(t, 0, 5);
  trackSeen(t, 590, 5_500);          // jumped 585 s in half a second
  play(t, 590, 595, 0.5, 5_500);
  assert.deepEqual(sorted(t), [0, 59]);
});

test("rewatching adds nothing new; going backwards marks nothing", () => {
  const t = fresh(); play(t, 0, 12);
  assert.deepEqual(play(t, 0, 12, 0.5, 20_000), []);
  assert.deepEqual(trackSeen(t, 3, 40_000), []);
});

test("pause for minutes, then seek ahead: the jump doesn't count", () => {
  const t = fresh(); play(t, 0, 10);
  trackSeen(t, 400, 10_000 + 300_000);   // 5 min later, 390 s further on
  assert.deepEqual(sorted(t), [0, 1]);
});
