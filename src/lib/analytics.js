export function conversionPercent(previous, next) {
  return previous > 0 ? Math.round((next / previous) * 100) : null;
}

export function funnelRates(stages) {
  const signupCount = stages.find((stage) => stage.key === "signedUp")?.count ?? 0;
  return stages.map((stage, index) => ({
    ...stage,
    ofSignups: signupCount ? Math.round(stage.count / signupCount * 100) : null,
    conversion: index === 0 ? null : conversionPercent(stages[index - 1].count, stage.count),
  }));
}

export function medianDaysBetween(rows) {
  const values = rows.map(({ signed_up_at, paid_at }) =>
    signed_up_at && paid_at ? Math.max(0, (new Date(paid_at) - new Date(signed_up_at)) / 86_400_000) : null,
  ).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return Math.round((values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2) * 10) / 10;
}

// Supabase stores timestamps in UTC; group revenue by the calendar week in India.
export function istWeekKey(value) {
  const date = new Date(value);
  const ist = new Date(date.getTime() + 330 * 60_000);
  const day = ist.getUTCDay();
  ist.setUTCDate(ist.getUTCDate() - ((day + 6) % 7));
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
}

export function revenueByIstWeek(rows) {
  const weeks = new Map();
  for (const row of rows) {
    if (row.status === "revoked") continue;
    const key = istWeekKey(row.created_at);
    weeks.set(key, (weeks.get(key) ?? 0) + (row.amount_paise ?? 0));
  }
  return [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([week, amountPaise]) => ({ week, amountPaise }));
}

// Stages after sign-up follow the same cohort: students who signed up in the range.
export function funnelCounts({ profiles, progress, lessonIds, accesses, quizzes = [], attempts = [], resources = [] }) {
  const cohort = new Set(profiles.map((row) => row.id));
  progress = progress.filter((row) => cohort.has(row.student_id));
  accesses = accesses.filter((row) => cohort.has(row.student_id));
  const started = new Set(progress.filter((row) => lessonIds.has(row.lesson_id)).map((row) => row.student_id));
  const completedByStudent = new Map();
  for (const row of progress) {
    if (lessonIds.has(row.lesson_id) && row.completed_at) {
      completedByStudent.set(row.student_id, (completedByStudent.get(row.student_id) ?? 0) + 1);
    }
  }
  const finished = new Set([...completedByStudent].filter(([, count]) => lessonIds.size > 0 && count >= lessonIds.size).map(([id]) => id));
  const bought = new Set(accesses.map((row) => row.student_id));
  const signedUp = new Set(profiles.map((row) => row.id));
  const quizIds = new Set(quizzes.filter((quiz) => lessonIds.has(quiz.lesson_id) || quiz.is_module0).map((quiz) => quiz.id));
  const attemptedQuiz = new Set(attempts.filter((row) => quizIds.has(row.quiz_id) && cohort.has(row.student_id)).map((row) => row.student_id));
  const passedQuiz = new Set(attempts.filter((row) => quizIds.has(row.quiz_id) && row.passed && cohort.has(row.student_id)).map((row) => row.student_id));
  const openedResource = new Set(resources.filter((row) => cohort.has(row.student_id) && row.opens > 0).map((row) => row.student_id));
  return funnelRates([
    { key: "signedUp", label: "Signed up", count: signedUp.size },
    { key: "started", label: "Started Module 0", count: started.size },
    { key: "finished", label: "Finished Module 0", count: finished.size },
    { key: "attemptedQuiz", label: "Attempted quiz", count: attemptedQuiz.size },
    { key: "passedQuiz", label: "Passed quiz", count: passedQuiz.size },
    { key: "openedResource", label: "Opened PDF", count: openedResource.size },
    { key: "bought", label: "Bought", count: bought.size },
  ]);
}

export function quizHealth(quizzes, attempts) {
  return quizzes.map((quiz) => {
    const rows = attempts.filter((attempt) => attempt.quiz_id === quiz.id);
    return {
      id: quiz.id,
      title: quiz.title,
      attempts: rows.length,
      passRate: rows.length ? Math.round((rows.filter((row) => row.passed).length / rows.length) * 100) : 0,
      averageScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.total ? row.score / row.total * 100 : 0), 0) / rows.length) : 0,
    };
  });
}
