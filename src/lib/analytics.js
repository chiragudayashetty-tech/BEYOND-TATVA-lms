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

// ── Module watching (parts really played, 20261115000002) ───────────────────
// Which tenths of a video a progress row has seen: from its 10-second parts, or (older rows
// without parts) everything up to its watched %.
export function tenthsSeen(row, videoSeconds) {
  const out = new Array(10).fill(false);
  const len = row.video_seconds || videoSeconds;
  if (row.completed_at && !(row.seen?.length)) return out.fill(true);
  if (row.seen?.length && len > 0) {
    for (const p of row.seen) { const t = Math.min(9, Math.floor((p * 10) / len * 10)); out[t] = true; }
    return out;
  }
  const pct = row.watched_pct ?? 0;
  for (let t = 0; t < 10; t++) out[t] = pct >= (t + 1) * 10;
  return out;
}

// Per lesson: how many started, average % watched, how many finished, and the share of starters
// who watched each tenth of the video (where students drop off).
export function moduleWatch(lessons, progress) {
  return lessons.map((lesson) => {
    const rows = progress.filter((row) => row.lesson_id === lesson.id);
    const pctOf = (row) => (row.completed_at ? 100 : row.watched_pct ?? 0);
    const curve = new Array(10).fill(0);
    for (const row of rows) tenthsSeen(row, (lesson.minutes ?? 0) * 60).forEach((seen, t) => { if (seen) curve[t]++; });
    return {
      id: lesson.id, title: lesson.title, started: rows.length,
      avgPct: rows.length ? Math.round(rows.reduce((sum, row) => sum + pctOf(row), 0) / rows.length) : null,
      completed: rows.filter((row) => row.completed_at).length,
      curve: curve.map((n) => (rows.length ? Math.round((n / rows.length) * 100) : 0)),
    };
  });
}

// Students to nudge: started a module but haven't learned for `idleDays`, or signed up `idleDays` ago
// and never started. Students who finished every lesson are left out. Oldest activity first.
export function needsNudge(students, progress, lessonCount, now = Date.now(), idleDays = 7) {
  const DAY = 86_400_000;
  const byStudent = new Map();
  for (const row of progress) byStudent.set(row.student_id, [...(byStudent.get(row.student_id) ?? []), row]);
  const out = [];
  for (const s of students) {
    const rows = byStudent.get(s.student_id) ?? [];
    const finished = lessonCount > 0 && rows.filter((row) => row.completed_at).length >= lessonCount;
    if (finished) continue;
    const lastWatch = Math.max(0, ...rows.map((row) => new Date(row.updated_at ?? 0).getTime()));
    const last = Math.max(lastWatch, s.last_active ? new Date(s.last_active).getTime() : 0);
    if (rows.length === 0) {
      if (now - new Date(s.signed_up_at).getTime() >= idleDays * DAY) out.push({ ...s, reason: "Never started", last: null });
    } else if (now - last >= idleDays * DAY) {
      out.push({ ...s, reason: "Stopped watching", last: new Date(last).toISOString() });
    }
  }
  return out.sort((a, b) => (a.last ? new Date(a.last).getTime() : 0) - (b.last ? new Date(b.last).getTime() : 0));
}
