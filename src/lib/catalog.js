// Course helpers shared by server and client code. The course itself lives in Supabase
// (courses → chapters as modules → lessons); see getCourse() in lib/data.js.

export const COURSE_ID = "ai-for-students";

// Shapes database rows into the course object the UI uses.
// `done` is a Set of completed lesson ids for the viewer (empty for visitors).
// Progress counts partly watched lessons too: a finished lesson is 100%, an unfinished one counts its
// watched %, so "85% watched" on a lesson and its module's progress bar agree.
const lessonPct = (l) => (l.done ? 100 : Math.min(l.progressPct ?? 0, 99));   // 100% only when finished
const avgPct = (ls) => (ls.length ? Math.round(ls.reduce((a, l) => a + lessonPct(l), 0) / ls.length) : 0);

export function buildCourse(courseRow, chapterRows, lessonRows, done = new Set(), progressRows = []) {
  const progressByLesson = new Map(progressRows.map((row) => [row.lesson_id, row]));
  const modules = chapterRows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((ch) => {
      const lessons = lessonRows
        .filter((l) => l.chapter_id === ch.id)
        .sort((a, b) => a.position - b.position)
        .map((l, i) => {
          const progress = progressByLesson.get(l.id);
          const durationSeconds = (l.minutes ?? 0) * 60;
          const secondsWatched = progress?.seconds_watched ?? 0;
          return {
            id: l.id, n: l.position, idx: i + 1, title: l.title, description: l.description,
            mins: l.minutes ?? 0, module: ch.position, done: done.has(l.id), secondsWatched,
            lastPositionSeconds: progress?.last_position_seconds ?? 0, durationSeconds,
            progressPct: durationSeconds ? Math.min(100, Math.round(secondsWatched / durationSeconds * 100)) : null,
            progressUpdatedAt: progress?.updated_at ?? null,
          };
        });
      const doneCount = lessons.filter((l) => l.done).length;
      const firstOpen = lessons.find((l) => !l.done);
      if (doneCount > 0 && firstOpen) firstOpen.current = true;
      return {
        id: ch.id,
        n: ch.position,
        title: ch.title,
        blurb: ch.blurb ?? "",
        release: ch.release_at,
        free: ch.is_free,
        thumb: ch.thumbnail_url,
        week: ch.batch_week ?? null,
        week1: ch.batch1_week ?? null,
        // Studio only: when Batch 1 gets this module (never before its ready date).
        batch1Opens: ch.batch_week && courseRow.batch1_start
          ? new Date(Math.max(new Date(ch.release_at ?? 0).getTime(),
            new Date(courseRow.batch1_start).getTime() + ((ch.batch1_week ?? ch.batch_week) - 1) * 7 * 864e5)).toISOString()
          : null,
        lessons,
        mins: lessons.reduce((a, l) => a + l.mins, 0),
        progress: avgPct(lessons),
      };
    });
  const lessons = modules.flatMap((m) => m.lessons);
  const continueWatching = lessons
    .filter((lesson) => !lesson.done && lesson.secondsWatched > 0)
    .sort((a, b) => new Date(b.progressUpdatedAt ?? 0) - new Date(a.progressUpdatedAt ?? 0))[0] ?? null;
  const doneAll = lessons.filter((l) => l.done).length;
  return {
    id: courseRow.id,
    title: courseRow.title,
    tagline: courseRow.tagline ?? "",
    description: courseRow.description ?? "",
    grade: courseRow.grade ?? "",
    hero: courseRow.hero_url,
    price: courseRow.price_inr,
    listPrice: courseRow.list_price_inr ?? null,
    modules,
    lessons,
    continueWatching,
    lessonCount: lessons.length,
    mins: lessons.reduce((a, l) => a + l.mins, 0),
    progress: avgPct(lessons),
  };
}

export const getModule = (course, n) => course.modules.find((m) => m.n === Number(n));
export const moduleOfLesson = (course, lesson) => course.modules.find((m) => m.n === lesson.module);

// A module with no release date counts as released (drafts are simply not published).
export const isReleased = (m, now = Date.now()) => !m.release || new Date(m.release).getTime() <= now;
// A module dated in or after 2099 is a placeholder: shown as "Coming soon" and locked for everyone.
export const COMING_SOON_YEAR = 2099;
export const isComingSoon = (m) => !!m?.release && new Date(m.release).getUTCFullYear() >= COMING_SOON_YEAR;
export const nextPremiere = (course, now = Date.now()) => course.modules.find((m) => !isReleased(m, now) && !isComingSoon(m)) ?? null;

// A student can watch a module when it has premiered and is free or they have full access.
export const canWatch = (m, hasAccess, now = Date.now()) => isReleased(m, now) && (m.free || hasAccess);
export const continueWatching = (course, hasAccess) => course.lessons
  .filter((lesson) => !lesson.done && lesson.secondsWatched > 0 && canWatch(moduleOfLesson(course, lesson), hasAccess))
  .sort((a, b) => new Date(b.progressUpdatedAt ?? 0) - new Date(a.progressUpdatedAt ?? 0))[0] ?? null;

export const fmtPremiere = (iso) =>
  iso && new Date(iso).getUTCFullYear() >= COMING_SOON_YEAR
    ? "Coming soon"
    : iso
    ? new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : "Not scheduled";

// Learning rules (the database enforces them: migration 20261112000001). Screens read these so the
// numbers a student sees always match what they earn.
export const QUIZ_TRIES = 2;
export const XP_RULES = { quizAnswer: 10, module: 100, assignment: 50, quickCheck: 10 };
// A quiz still needs doing while it isn't passed and a try is left.
export const quizOpen = (best) => !best?.passed && (best?.tries ?? 0) < QUIZ_TRIES;

// The one thing a student should do next, so every screen can show the same clear button.
// Order: a lesson they left half-way → the next unwatched lesson → that module's quiz → its assignment
// → unlock → wait for the next module → all done.
// `activities` is getActivities(): { quizzes, assignments, best, submissions } (only open modules are in it).
export function nextStep(course, hasAccess, activities = {}, now = Date.now()) {
  const resume = continueWatching(course, hasAccess);
  if (resume) return { kind: "resume", lesson: resume, module: moduleOfLesson(course, resume) };
  for (const m of course.modules) {
    if (!canWatch(m, hasAccess, now) || !m.lessons.length) continue;
    const lesson = m.lessons.find((l) => !l.done);
    if (lesson) return { kind: "lesson", lesson, module: m, started: m.lessons.some((l) => l.done) };
    const quiz = (activities.quizzes ?? []).find((q) => q.chapter_id === m.id && quizOpen(activities.best?.[q.id]));
    if (quiz) return { kind: "quiz", quiz, module: m };
    const assignment = (activities.assignments ?? []).find((a) => a.chapter_id === m.id
      && (!activities.submissions?.[a.id] || activities.submissions[a.id].status === "returned"));
    if (assignment) return { kind: "assignment", assignment, module: m };
  }
  const locked = !hasAccess && course.modules.find((m) => isReleased(m, now) && !m.free);
  if (locked) return { kind: "unlock", module: locked };
  const upcoming = nextPremiere(course, now);
  if (upcoming) return { kind: "wait", module: upcoming };
  return { kind: course.lessons.length && course.lessons.every((l) => l.done) ? "done" : "none" };
}

// Where the step's button goes and what it says (short, for 13–15 year olds).
export function stepLink(courseId, step) {
  switch (step?.kind) {
    case "resume": return { href: `/watch/${courseId}?l=${step.lesson.n}`, label: "Continue watching", title: step.lesson.title, hint: `Module ${step.module.n} · Lesson ${step.lesson.idx} of ${step.module.lessons.length}` };
    case "lesson": return { href: `/watch/${courseId}?l=${step.lesson.n}`, label: step.started ? "Next lesson" : `Start Module ${step.module.n}`, title: step.lesson.title, hint: `Module ${step.module.n} · Lesson ${step.lesson.idx} of ${step.module.lessons.length}` };
    case "quiz": return { href: `/quiz/${step.quiz.id}`, label: "Take the quiz", title: step.quiz.title, hint: `You finished the Module ${step.module.n} videos. Now check what you learned.` };
    case "assignment": return { href: `/assignments/${step.assignment.id}`, label: "Do the assignment", title: step.assignment.title, hint: `Module ${step.module.n} · hand in your work` };
    case "unlock": return { href: "/unlock", label: "Unlock the course", title: `Module ${step.module.n}: ${step.module.title}`, hint: "You finished the free module. Unlock the rest to keep going." };
    case "wait": return { href: `/course/${step.module.n}`, label: "See the course", title: `Module ${step.module.n}: ${step.module.title}`, hint: `You're all caught up. This module opens ${fmtPremiere(step.module.release)}.` };
    case "done": return { href: "/certificates", label: "See your certificate", title: "You finished the course!", hint: "Every lesson is done. Well done!" };
    default: return null;
  }
}
