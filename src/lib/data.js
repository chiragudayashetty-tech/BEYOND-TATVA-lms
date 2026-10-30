import { cache } from "react";
import { createClient, getSession } from "./supabase/server";
import { COURSE_ID, buildCourse } from "./catalog";

// The course with the viewer's progress. Lesson titles are public; videos are fetched separately.
export const getCourse = cache(async () => {
  const supabase = await createClient();
  const { user } = await getSession();
  const [{ data: course }, { data: chapters }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("id, title, tagline, description, grade, hero_url, price_inr").eq("id", COURSE_ID).single(),
    supabase.from("chapters").select("id, title, blurb, position, release_at, is_free, thumbnail_url").eq("course_id", COURSE_ID),
    supabase.from("lessons").select("id, chapter_id, title, description, position, minutes").eq("course_id", COURSE_ID),
  ]);
  let done = new Set();
  if (user && user.id !== "preview") {
    const { data } = await supabase.from("lesson_progress").select("lesson_id").eq("student_id", user.id).not("completed_at", "is", null);
    done = new Set((data ?? []).map((r) => r.lesson_id));
  }
  return buildCourse(course, chapters ?? [], lessons ?? [], done);
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
  const [{ data: answers }, { data: progress }] = await Promise.all([
    supabase.from("checkpoint_answers").select("correct, created_at").eq("student_id", user.id),
    supabase.from("lesson_progress").select("completed_at").eq("student_id", user.id).not("completed_at", "is", null),
  ]);
  const xp = (answers ?? []).filter((a) => a.correct).length * 10;
  const days = new Set(
    [...(answers ?? []).map((a) => a.created_at), ...(progress ?? []).map((p) => p.completed_at)].map((t) =>
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
