// Course helpers shared by server and client code. The course itself lives in Supabase
// (courses → chapters as modules → lessons); see getCourse() in lib/data.js.

export const COURSE_ID = "ai-for-students";

// Shapes database rows into the course object the UI uses.
// `done` is a Set of completed lesson ids for the viewer (empty for visitors).
export function buildCourse(courseRow, chapterRows, lessonRows, done = new Set()) {
  const modules = chapterRows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((ch) => {
      const lessons = lessonRows
        .filter((l) => l.chapter_id === ch.id)
        .sort((a, b) => a.position - b.position)
        .map((l, i) => ({ id: l.id, n: l.position, idx: i + 1, title: l.title, description: l.description, mins: l.minutes ?? 0, module: ch.position, done: done.has(l.id) }));
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
        lessons,
        mins: lessons.reduce((a, l) => a + l.mins, 0),
        progress: lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0,
      };
    });
  const lessons = modules.flatMap((m) => m.lessons);
  const doneAll = lessons.filter((l) => l.done).length;
  return {
    id: courseRow.id,
    title: courseRow.title,
    tagline: courseRow.tagline ?? "",
    description: courseRow.description ?? "",
    grade: courseRow.grade ?? "",
    hero: courseRow.hero_url,
    price: courseRow.price_inr,
    modules,
    lessons,
    lessonCount: lessons.length,
    mins: lessons.reduce((a, l) => a + l.mins, 0),
    progress: lessons.length ? Math.round((doneAll / lessons.length) * 100) : 0,
  };
}

export const getModule = (course, n) => course.modules.find((m) => m.n === Number(n));
export const moduleOfLesson = (course, lesson) => course.modules.find((m) => m.n === lesson.module);

// A module with no release date counts as released (drafts are simply not published).
export const isReleased = (m, now = Date.now()) => !m.release || new Date(m.release).getTime() <= now;
export const nextPremiere = (course, now = Date.now()) => course.modules.find((m) => !isReleased(m, now)) ?? null;

// A student can watch a module when it has premiered and is free or they have full access.
export const canWatch = (m, hasAccess, now = Date.now()) => isReleased(m, now) && (m.free || hasAccess);

export const fmtPremiere = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : "Not scheduled";
