import { test } from "node:test";
import assert from "node:assert/strict";
import { conversionPercent, funnelCounts, istWeekKey, quizHealth, revenueByIstWeek } from "../src/lib/analytics.js";

test("funnel conversions are step to step and safe with an empty prior step", () => {
  assert.equal(conversionPercent(0, 2), 0);
  const funnel = funnelCounts({
    leads: [{ id: "lead" }],
    profiles: [{ id: "a" }, { id: "b" }],
    lessonIds: new Set(["l0", "l1"]),
    progress: [
      { student_id: "a", lesson_id: "l0", completed_at: "2026-01-01" },
      { student_id: "a", lesson_id: "l1", completed_at: "2026-01-02" },
      { student_id: "b", lesson_id: "l0", completed_at: null },
    ],
    accesses: [{ student_id: "a" }, { student_id: "old-student" }],
  });
  assert.deepEqual(funnel.map(({ count, conversion }) => [count, conversion]), [[1, null], [2, 200], [2, 100], [1, 50], [1, 100]]);
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
  assert.deepEqual(funnel.map((s) => s.count), [0, 1, 0, 0, 0]);
});
