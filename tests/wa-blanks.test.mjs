import { test } from "node:test";
import assert from "node:assert/strict";
import { BLANKS, blankLabel } from "../src/lib/wa-blanks.js";

test("blank names read as plain words, fixed text is shown in quotes", () => {
  assert.equal(blankLabel("{parent_name}"), "Parent name");
  assert.equal(blankLabel("15 Nov"), '"15 Nov"');
  assert.ok(BLANKS.length >= 6);
});
