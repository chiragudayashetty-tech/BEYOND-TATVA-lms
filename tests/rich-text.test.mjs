import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRichText } from "../src/lib/rich-text.js";

test("keeps headings, line breaks and bullet lists as typed", () => {
  const blocks = parseRichText("**6 Modules**\r\nLearn AI.\r\n\r\n**Included**\r\n- Weekly lessons.\r\n- PDF notes.");
  assert.deepEqual(blocks.map((b) => b.type), ["p", "p", "list"]);
  assert.deepEqual(blocks[0].lines, [[{ text: "6 Modules", bold: true }], [{ text: "Learn AI.", bold: false }]]);
  assert.equal(blocks[2].items.length, 2);
  assert.equal(blocks[2].items[1][0].text, "PDF notes.");
});

test("bold inside a sentence, plain text and empty input", () => {
  assert.deepEqual(parseRichText("Watch **every** Sunday")[0].lines[0], [{ text: "Watch ", bold: false }, { text: "every", bold: true }, { text: " Sunday", bold: false }]);
  assert.deepEqual(parseRichText("One line."), [{ type: "p", lines: [[{ text: "One line.", bold: false }]] }]);
  assert.deepEqual(parseRichText(null), []);
  assert.equal(parseRichText("<b>hi</b>")[0].lines[0][0].text, "<b>hi</b>"); // shown as text, never as HTML
});
