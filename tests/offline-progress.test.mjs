import { test } from "node:test";
import assert from "node:assert/strict";
import { afterSave } from "../src/lib/offline-queue.js";

test("a long offline watch is sent again until the server has taken all of it", () => {
  let rec = { seconds: 1800, seen: Array.from({ length: 180 }, (_, i) => i) }, saves = 0, pct = 0;
  while (rec && saves < 100) { pct = Math.min(pct + 8, 95); rec = afterSave(rec, { pct }); saves++; }
  assert.ok(saves > 10, "kept sending while % went up");
  assert.equal(rec, undefined, "dropped once % stopped going up");
});

test("a short watch: one more save, then dropped; 100% drops at once", () => {
  const rec = afterSave({ seen: [0, 1] }, { pct: 10 });
  assert.equal(rec.lastPct, 10);
  assert.equal(afterSave(rec, { pct: 10 }), undefined);
  assert.equal(afterSave({ seen: [0] }, { pct: 100 }), undefined);
  assert.equal(afterSave({ seen: [] }, { pct: 5 }), undefined, "no parts: nothing more to send");
});

test("never loops forever", () => {
  assert.equal(afterSave({ seen: [1], tries: 59, lastPct: 1 }, { pct: 2 }), undefined);
});
