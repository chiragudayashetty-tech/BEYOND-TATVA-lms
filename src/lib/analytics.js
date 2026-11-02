export function conversionPercent(previous, next) {
  return previous > 0 ? Math.round((next / previous) * 100) : 0;
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
export function funnelCounts({ leads, profiles, progress, lessonIds, accesses }) {
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
  return [
    { key: "leads", label: "Leads", count: leads.length },
    { key: "signedUp", label: "Signed up", count: signedUp.size },
    { key: "started", label: "Started Module 0", count: started.size },
    { key: "finished", label: "Finished Module 0", count: finished.size },
    { key: "bought", label: "Bought", count: bought.size },
  ].map((stage, index, all) => ({ ...stage, conversion: index === 0 ? null : conversionPercent(all[index - 1].count, stage.count) }));
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
