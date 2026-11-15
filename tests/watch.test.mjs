import { test } from "node:test";
import assert from "node:assert/strict";
import { trackSeen } from "../src/lib/watch.js";

const play = (t, from, to, step = 0.5) => { const out = []; for (let s = from; s <= to; s += step) out.push(...trackSeen(t, s)); return out; };

test("normal playback marks every part played", () => {
  const t = { last: null, seen: new Set() };
  play(t, 0, 25);
  assert.deepEqual([...t.seen].sort((a, b) => a - b), [0, 1, 2]);
});

test("a seek to the end marks nothing in between", () => {
  const t = { last: null, seen: new Set() };
  play(t, 0, 5);
  trackSeen(t, 590);          // jumped
  play(t, 590, 595);
  assert.deepEqual([...t.seen].sort((a, b) => a - b), [0, 59]);
});

test("rewatching adds nothing new; going backwards marks nothing", () => {
  const t = { last: null, seen: new Set() };
  play(t, 0, 12);
  assert.deepEqual(play(t, 0, 12), []);
  assert.deepEqual(trackSeen(t, 3), []);
});
