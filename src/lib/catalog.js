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
