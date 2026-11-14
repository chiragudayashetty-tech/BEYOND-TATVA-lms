import test from "node:test";
import assert from "node:assert/strict";
import { addDays, due, groupByTab, istToday, leadsToFollow, mobile, schoolsToFollow, waLink } from "../src/lib/today.js";

const today = "2026-11-08";

test("IST day and date maths", () => {
  assert.equal(istToday(new Date("2026-11-07T19:00:00Z")), "2026-11-08"); // 00:30 IST
  assert.equal(addDays(today, 7), "2026-11-15");
  assert.deepEqual(["2026-11-07", today, "2026-11-15", "2026-11-16", null].map((d) => due(d, today)), ["overdue", "today", "soon", "later", "none"]);
});

test("schools: due within a week or hot, never not interested, overdue first", () => {
  const rows = schoolsToFollow([
    { name: "Soon", next_date: "2026-11-10" },
    { name: "Hot", status: "Workshop booked", next_date: null },
    { name: "Far", next_date: "2026-12-01" },
    { name: "Dropped", status: "Not interested", next_date: "2026-11-01" },
    { name: "Late", next_date: "2026-11-01" },
    { name: "Now", next_date: today },
  ], today);
  assert.deepEqual(rows.map((r) => r.name), ["Late", "Now", "Soon", "Hot"]);
});

test("leads: not paid, not do-not-contact, due or open", () => {
  const rows = leadsToFollow([
    { student: "Paid", paid: true },
    { student: "DNC", do_not_contact: true },
    { student: "Empty", status: "" },
    { student: "Hot", status: "Very interested" },
    { student: "No", status: "Not interested" },
    { student: "Cold", status: "Joined other class", next_date: "2026-12-20" },
    { student: "Due", status: "Joined other class", next_date: "2026-11-05" },
  ], today);
  assert.deepEqual(rows.map((r) => r.student), ["Due", "Empty", "Hot"]);
  assert.deepEqual(groupByTab([{ tab: "SRVK" }, { tab: "Website" }, {}]).map(([t]) => t), ["Website", "Manual", "SRVK"]);
});

test("phone links", () => {
  assert.equal(mobile("+91 98450-12345"), "9845012345");
  assert.equal(mobile("098450 12345"), "9845012345");
  assert.equal(mobile("0820 252525"), null);
  const link = waLink("9845012345", { student: "Asha Rao" });
  assert.ok(link.startsWith("https://wa.me/919845012345?text="));
  assert.match(decodeURIComponent(link), /Asha's AI course/);
  assert.equal(waLink("123"), null);
});

test("schools: sheet words (2026-11-14) — hot, dropped, closed after the workshop", () => {
  const rows = schoolsToFollow([
    { name: "Meeting", status: "Meeting" },
    { name: "Asked", status: "Date requested" },
    { name: "Confirmed", status: "Workshop confirmed" },
    { name: "Dropped", status: "Dropped", next_date: today },
    { name: "Closed", status: "Workshop done", after_status: "Closed", next_date: today },
    { name: "Following", status: "Workshop done", after_status: "Following up" },
    { name: "OnHold", status: "On hold" },
  ], today);
  assert.deepEqual(rows.map((r) => r.name).sort(), ["Asked", "Confirmed", "Following", "Meeting"]);
});
