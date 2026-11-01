import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient, getSession } from "./supabase/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase/config";
import { COURSE_ID, buildCourse } from "./catalog";

const CATALOG = {
  course: "id, title, tagline, description, grade, hero_url, price_inr",
  chapters: "id, title, blurb, position, release_at, is_free, thumbnail_url",
  lessons: "id, chapter_id, title, description, position, minutes",
};

async function loadCatalog(supabase, courseId) {
  const [{ data: course }, { data: chapters }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select(CATALOG.course).eq("id", courseId).single(),
    supabase.from("chapters").select(CATALOG.chapters).eq("course_id", courseId),
    supabase.from("lessons").select(CATALOG.lessons).eq("course_id", courseId),
  ]);
  return { course, chapters: chapters ?? [], lessons: lessons ?? [] };
}

// Published course content is the same for every student, so it is cached across requests (no cookies:
// anonymous client, published rows only). Studio saves call updateTag(COURSE_TAG) to refresh it.
export const COURSE_TAG = "course";
const cachedCatalog = unstable_cache(
  async (courseId) => {
    const catalog = await loadCatalog(createAnonClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }), courseId);
    if (!catalog.course) throw new Error("course not found"); // never cache a failed read
    return catalog;
  },
  ["course-catalog-v1"],
  { tags: [COURSE_TAG], revalidate: 300 },
);

// The course with the viewer's progress. Lesson titles are public; videos are fetched separately.
// Admins read live (they also see unpublished drafts); everyone else gets the cached copy.
export const getCourse = cache(async (courseId = COURSE_ID) => {
  const supabase = await createClient();
  const { user, profile } = await getSession();
  const live = user?.id === "preview" || profile?.role === "admin";
  const progress = user && user.id !== "preview"
    ? supabase.from("lesson_progress").select("lesson_id").eq("student_id", user.id).not("completed_at", "is", null)
    : Promise.resolve({ data: [] });
  const catalogP = live ? loadCatalog(supabase, courseId) : cachedCatalog(courseId).catch(() => loadCatalog(supabase, courseId));
  const [{ course, chapters, lessons }, { data: rows }] = await Promise.all([catalogP, progress]);
  const done = new Set((rows ?? []).map((r) => r.lesson_id));
  return buildCourse(course, chapters, lessons, done);
});

// The video link for a lesson, or null when the viewer may not watch it (enforced by RLS).
export async function getLessonVideo(lessonId) {
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_media").select("video_url").eq("lesson_id", lessonId).maybeSingle();
  return data?.video_url ?? null;
}

// XP = 10 per correct in-video answer. Streak = consecutive days with any completed lesson or answer.
export const getStudentStats = cache(async () => {
  const { user } = await getSession();
  if (!user || user.id === "preview") return { xp: 0, streak: 0, answers: 0 };
  const supabase = await createClient();
  const [{ data: answers }, { data: progress }, { data: passed }] = await Promise.all([
    supabase.from("checkpoint_answers").select("correct, created_at").eq("student_id", user.id),
    supabase.from("lesson_progress").select("completed_at").eq("student_id", user.id).not("completed_at", "is", null),
    supabase.from("quiz_attempts").select("quiz_id, created_at, quizzes(xp)").eq("student_id", user.id).eq("passed", true),
  ]);
  // 10 XP per correct in-video answer, plus each passed quiz's XP once.
  const quizXp = Object.values(Object.fromEntries((passed ?? []).map((p) => [p.quiz_id, p.quizzes?.xp ?? 0]))).reduce((a, b) => a + b, 0);
  const xp = (answers ?? []).filter((a) => a.correct).length * 10 + quizXp;
  const days = new Set(
    [...(answers ?? []).map((a) => a.created_at), ...(progress ?? []).map((p) => p.completed_at), ...(passed ?? []).map((p) => p.created_at)].map((t) =>
      new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })),
  );
  let streak = 0;
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (days.has(key)) streak += 1;
    else if (streak > 0 || key !== new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })) break;
  }
  return { xp, streak, answers: answers?.length ?? 0 };
});

// Quizzes and assignments the viewer can open, with their own results. RLS hides unpublished
// and locked ones, so this only ever returns what the student may see.
export const getActivities = cache(async () => {
  const { user } = await getSession();
  if (!user || user.id === "preview") return { quizzes: [], assignments: [], best: {}, submissions: {} };
  const supabase = await createClient();
  const [{ data: quizzes }, { data: assignments }, { data: attempts }, { data: subs }] = await Promise.all([
    supabase.from("quizzes").select("id, chapter_id, title, pass_percent, xp"),
    supabase.from("assignments").select("id, chapter_id, title, instructions, allow_text, allow_link, allow_files, max_marks, due_at, position").order("position").order("created_at"),
    supabase.from("quiz_attempts").select("quiz_id, score, total, passed").eq("student_id", user.id),
    supabase.from("assignment_submissions").select("id, assignment_id, status, marks, feedback, text_answer, link_url, files, updated_at").eq("student_id", user.id),
  ]);
  const best = {};
  for (const a of attempts ?? []) {
    const b = best[a.quiz_id];
    if (!b || a.score > b.score) best[a.quiz_id] = { score: a.score, total: a.total, passed: a.passed || Boolean(b?.passed) };
    else if (a.passed) b.passed = true;
  }
  return {
    quizzes: quizzes ?? [],
    assignments: assignments ?? [],
    best,
    submissions: Object.fromEntries((subs ?? []).map((s) => [s.assignment_id, s])),
  };
});
