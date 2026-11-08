import { test } from "node:test";
import assert from "node:assert/strict";
import { conversionPercent, funnelCounts, istWeekKey, medianDaysBetween, quizHealth, revenueByIstWeek } from "../src/lib/analytics.js";

test("funnel conversions are step to step and safe with an empty prior step", () => {
  assert.equal(conversionPercent(0, 2), null);
  const funnel = funnelCounts({
    profiles: [{ id: "a" }, { id: "b" }],
    lessonIds: new Set(["l0", "l1"]),
    progress: [
      { student_id: "a", lesson_id: "l0", completed_at: "2026-01-01" },
      { student_id: "a", lesson_id: "l1", completed_at: "2026-01-02" },
      { student_id: "b", lesson_id: "l0", completed_at: null },
    ],
    accesses: [{ student_id: "a" }, { student_id: "old-student" }],
  });
  assert.deepEqual(funnel.map(({ count, conversion, ofSignups }) => [count, conversion, ofSignups]), [[2, null, 100], [2, 100, 100], [1, 50, 50], [0, 0, 0], [0, null, 0], [0, null, 0], [1, null, 50]]);
});

test("funnel reports no previous-stage conversion when the previous count is zero", () => {
  const stages = funnelCounts({
    profiles: [{ id: "student" }], lessonIds: new Set(["lesson"]),
    progress: [], accesses: [{ student_id: "student" }],
  });
  const bought = stages.at(-1);
  assert.equal(bought.count, 1);
  assert.equal(bought.conversion, null);
  assert.equal(bought.ofSignups, 100);
});

test("median time to purchase ignores rows missing either timestamp", () => {
  assert.equal(medianDaysBetween([
    { signed_up_at: "2026-01-01", paid_at: "2026-01-02" },
    { signed_up_at: "2026-01-01", paid_at: "2026-01-05" },
    { signed_up_at: "2026-01-01", paid_at: null },
  ]), 2.5);
  assert.equal(medianDaysBetween([{ signed_up_at: "2026-01-01", paid_at: null }]), null);
});

test("IST week key starts on Monday even around UTC date boundaries", () => {
  assert.equal(istWeekKey("2026-11-01T20:00:00.000Z"), "2026-11-02");
  assert.equal(istWeekKey("2026-11-08T17:59:00.000Z"), "2026-11-02");
});

test("revenue is grouped by IST week and excludes revoked purchases", () => {
  assert.deepEqual(revenueByIstWeek([
    { created_at: "2026-11-01T20:00:00Z", amount_paise: 10000, status: "claimed" },
    { created_at: "2026-11-02T01:00:00Z", amount_paise: 5000, status: "pending" },
    { created_at: "2026-11-02T02:00:00Z", amount_paise: 9000, status: "revoked" },
  ]), [{ week: "2026-11-02", amountPaise: 15000 }]);
});

test("quiz health reports attempts, pass rate and average percentage score", () => {
  assert.deepEqual(quizHealth([{ id: "q", title: "Quiz" }], [
    { quiz_id: "q", passed: true, score: 4, total: 5 },
    { quiz_id: "q", passed: false, score: 2, total: 5 },
  ]), [{ id: "q", title: "Quiz", attempts: 2, passRate: 50, averageScore: 60 }]);
});

test("funnel stages after sign-up only count the sign-up cohort", () => {
  const funnel = funnelCounts({
    leads: [], profiles: [{ id: "new" }], lessonIds: new Set(["l0"]),
    progress: [{ student_id: "old", lesson_id: "l0", completed_at: "2026-01-01" }],
    accesses: [{ student_id: "old" }],
  });
  assert.deepEqual(funnel.map((s) => s.count), [1, 0, 0, 0, 0, 0, 0]);
});
