import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

// Load the Apps Script file as plain JS (it exports its pure helpers when `module` exists).
const code = readFileSync(new URL("../scripts/leads-tracker-sync.gs", import.meta.url), "utf8");
const sandbox = { module: { exports: {} }, require: createRequire(import.meta.url) };
vm.runInNewContext(code, sandbox);
const api = sandbox.module.exports;
const plain = (x) => JSON.parse(JSON.stringify(x)); // sandbox arrays → normal arrays for deepEqual
const { payload_, problem_, newRow_, safeToDelete_, sourceLabel_ } = api;
const changes_ = (...a) => plain(api.changes_(...a));

const head = ["School", "Workshop date", "Student name", "Class", "Section", "Parent phone", "Device", "Next step", "Next date", "Paid?", "Do not contact", "Source", "Short note", "Signed up", "Module 0", "ID"];
const row = ["Durga English Medium School", new Date("2026-11-20T00:00:00Z"), "Ria", 9, "B", "9845122222", "Phone", "Call back", new Date("2026-11-21T00:00:00Z"), "Pending", "", "Workshop", "after 6", "", "", ""];

test("row → payload: core fields by header name, everything else kept", () => {
  const p = payload_(head, row, 5, ["status"]);
  assert.equal(p.row, 5);
  assert.equal(p.student, "Ria");
  assert.equal(p.grade, "9");
  assert.equal(p.status, "Call back");
  assert.equal(p.next_date, "2026-11-21");
  assert.equal(p.do_not_contact, false);
  assert.equal(p.note, "after 6");
  assert.deepEqual(JSON.parse(JSON.stringify(p.sheet)), { "Workshop date": "2026-11-20", "Device": "Phone", "Paid?": "Pending" });
  assert.deepEqual([...p.touched], ["status"]);
  assert.equal(p.id, "");
});

test("columns in any order still map", () => {
  const h2 = [...head].reverse(), r2 = [...row].reverse();
  assert.equal(payload_(h2, r2, 2).student, "Ria");
});

test("rows that can't be sent say why; blank rows are skipped", () => {
  assert.equal(problem_({ student: "", phone: "" }), "empty");
  assert.match(problem_({ student: "", phone: "9845122222" }), /student name/);
  assert.match(problem_({ student: "Ria", phone: "98451" }), /parent phone/);
  assert.equal(problem_({ student: "Ria", phone: "98451 22222" }), null);
});

test("pull: only differing LMS cells change; paid never un-set", () => {
  const rec = { signed_up: true, module0: false, paid: false, updated_source: "sheet" };
  const c = changes_(head, row, rec, 0);
  assert.deepEqual(c.map(([i, v]) => [head[i], v]), [["Signed up", "Yes"], ["Module 0", "Not yet"]]);
  const paid = changes_(head, row, { ...rec, paid: true }, 0);
  assert.ok(paid.some(([i, v]) => head[i] === "Paid?" && v === "Yes"));
});

test("Studio log comes back only if newer than the last hand edit", () => {
  const rec = { signed_up: false, updated_source: "studio", updated_at: "2026-11-14T10:00:00Z", status: "Closed", note: "said no", next_date: null, do_not_contact: true };
  const newer = changes_(head, row, rec, Date.parse("2026-11-14T09:00:00Z")).map(([i, v]) => [head[i], v]);
  assert.deepEqual(Object.fromEntries(newer.filter(([h]) => h !== "Signed up")), { "Next step": "Closed", "Next date": "", "Do not contact": "Yes", "Short note": "said no" });
  const typedAfter = changes_(head, row, rec, Date.parse("2026-11-14T11:00:00Z")).map(([i]) => head[i]);
  assert.ok(!typedAfter.includes("Next step"));
});

test("new rows follow the sheet's column order", () => {
  const r = newRow_(head, { id: "abc", school: "SRVK", student: "Web Kid", phone: "9845011111", source: "website", status: null, paid: false, signed_up: false });
  assert.equal(r[head.indexOf("ID")], "abc");
  assert.equal(r[head.indexOf("Source")], "Website");
  assert.equal(r[head.indexOf("Device")], "");
  assert.equal(r.length, head.length);
  assert.equal(sourceLabel_("loki_chat"), "Loki chat");
});

test("safety net: never mass-delete on a bad answer", () => {
  assert.equal(safeToDelete_(0, 100, 100), true);
  assert.equal(safeToDelete_(3, 100, 97), true);
  assert.equal(safeToDelete_(1, 100, 0), false);
  assert.equal(safeToDelete_(30, 100, 70), false);
});
