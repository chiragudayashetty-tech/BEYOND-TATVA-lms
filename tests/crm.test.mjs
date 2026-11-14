import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFilters, classSections, facets, filterQuery, groupBySchool, leadOutcome, parseFilters, sortRows } from "../src/lib/crm.js";

const today = "2026-11-14";
const rows = [
  { name: "Asha", phone: "+919800000001", school: "SRVK", grade: 9, section: "B", source: "workshop", outcome: "won", siblings: null, lead_at: "2026-11-06" },
  { name: "Aryan", phone: "+919800000002", school: "SRVK", grade: 10, section: "A", source: "workshop", outcome: "lost", siblings: "Dhyan", lead_at: "2026-11-06" },
  { name: "Dhyan", phone: "+919800000002", school: "srvk", grade: 10, section: "a", source: "workshop", outcome: "lost", siblings: "Aryan", lead_at: "2026-11-06" },
  { name: "Ravi", phone: "+919800000003", school: "Durga English Medium School", grade: 8, section: "A", source: "workshop", outcome: "open", next_date: "2026-11-14", lead_at: "2026-11-13" },
  { name: "Web", phone: "+919800000004", school: null, grade: 9, source: "website", outcome: "open", next_date: "2026-11-20", lead_at: "2026-11-12" },
];

test("same rule as the database", () => {
  assert.equal(leadOutcome("Call back"), "open");
  assert.equal(leadOutcome("Closed (calling ended)"), "lost");
  assert.equal(leadOutcome("Not interested"), "lost");
  assert.equal(leadOutcome("Call", false, true), "dnc");
  assert.equal(leadOutcome("Not interested", true), "won");
  assert.equal(leadOutcome("Enrolled", false, true), "won");
});

test("filters combine and ignore case", () => {
  const f = parseFilters({ school: "SRVK", class: "10", section: "A", siblings: "1" });
  assert.deepEqual(applyFilters(rows, f, today).map((r) => r.name), ["Aryan", "Dhyan"]);
  assert.deepEqual(applyFilters(rows, parseFilters({ status: "open", due: "1" }), today).map((r) => r.name), ["Ravi"]);
  assert.deepEqual(applyFilters(rows, parseFilters({ school: "(no school)" }), today).map((r) => r.name), ["Web"]);
  assert.deepEqual(applyFilters(rows, parseFilters({ q: "00003" }), today).map((r) => r.name), ["Ravi"]);
  assert.equal(applyFilters(rows, parseFilters({ status: "bogus", class: "x" }), today).length, rows.length);
});

test("query string round trip", () => {
  const f = parseFilters({ school: "Durga English Medium School", class: "9", status: "open" });
  assert.equal(filterQuery(f), "school=Durga%20English%20Medium%20School&class=9&status=open");
  assert.equal(filterQuery(f, { school: null }), "class=9&status=open");
});

test("group by school with conversion, then class and section", () => {
  const g = groupBySchool(rows);
  assert.deepEqual(g.map((x) => [x.school, x.total, x.won]), [["SRVK", 3, 1], ["Durga English Medium School", 1, 0], ["(no school)", 1, 0]]);
  assert.equal(Math.round(g[0].conversion * 100), 33);
  const cs = classSections(rows.filter((r) => /srvk/i.test(r.school ?? "")));
  assert.deepEqual(cs.map((x) => [x.grade, x.section, x.total]), [["9", "B", 1], ["10", "A", 2]]);
});

test("siblings sit together; facets list what exists", () => {
  const s = sortRows(rows);
  const i = s.findIndex((r) => r.name === "Aryan");
  assert.equal(s[i + 1].name, "Dhyan");
  const fc = facets(rows);
  assert.deepEqual(fc.grades, [8, 9, 10]);
  assert.deepEqual(fc.sections, ["A", "B"]);
  assert.equal(fc.schools.at(-1), "(no school)");
});
