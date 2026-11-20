import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// scripts/sheets-loader.gs runs the downloaded sync code with new Function(...) and calls these by name.
const ENTRY = ["onOpen", "setupSync", "syncAll", "checkSync", "pull", "onEditSync"];
for (const f of ["sheets-sync.gs", "leads-tracker-sync.gs"]) {
  test(`${f} loads in the sheet loader and has every entry point`, () => {
    const body = fs.readFileSync(new URL(`../scripts/${f}`, import.meta.url), "utf8");
    const api = new Function(`${body}\nreturn { ${ENTRY.map((n) => `${n}: ${n}`).join(", ")} };`)();
    for (const n of ENTRY) assert.equal(typeof api[n], "function", n);
  });
}
