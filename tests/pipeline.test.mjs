import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../src/lib/pipeline.js";

test("CSV quotes cells, names stages and neutralises formulas", () => {
  const csv = toCsv([{ stage: 3, stalled: true, name: '=HYPERLINK("x")', parent_name: 'Mom "A"', phone: "+919845012345" }]);
  const [head, row] = csv.split("\n");
  assert.ok(head.startsWith("stage,outcome,status,stalled,name"));
  assert.ok(row.startsWith('"Started","","","true","\'=HYPERLINK(""x"")","Mom ""A""","+919845012345"'));
});
