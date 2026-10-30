"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COURSE_ID } from "@/lib/catalog";

// Admin writes. Row-level security rejects every one of these unless the caller is an admin.

const str = (fd, k) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const num = (fd, k) => {
  const v = Number(fd.get(k));
  return Number.isFinite(v) ? v : null;
};
// <input type="datetime-local"> gives local IST wall time without a zone.
const istToIso = (v) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);

async function run(fn) {
  const supabase = await createClient();
  const { error } = await fn(supabase);
  if (error) return { ok: false, error: error.message.includes("row-level security") ? "Only an admin can do this. Sign in with your admin account." : error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCourse(_, fd) {
  return run((s) => s.from("courses").update({
    title: str(fd, "title"),
    tagline: str(fd, "tagline"),
    description: str(fd, "description"),
    price_inr: num(fd, "price") ?? 0,
    hero_url: str(fd, "hero"),
  }).eq("id", COURSE_ID));
}

export async function saveModule(_, fd) {
  const row = {
    title: str(fd, "title"),
    blurb: str(fd, "blurb"),
    release_at: istToIso(str(fd, "release")),
    is_free: fd.get("free") === "on",
    thumbnail_url: str(fd, "thumb"),
  };
  if (!row.title) return { ok: false, error: "Give the module a title." };
  const id = str(fd, "id");
  return run(async (s) => {
    if (id) return s.from("chapters").update(row).eq("id", id);
    const { data: last } = await s.from("chapters").select("position").eq("course_id", COURSE_ID).order("position", { ascending: false }).limit(1).maybeSingle();
    return s.from("chapters").insert({ ...row, course_id: COURSE_ID, position: (last?.position ?? -1) + 1 });
  });
}

export async function deleteModule(id) {
  return run((s) => s.from("chapters").delete().eq("id", id));
}

export async function saveLesson(_, fd) {
  const id = str(fd, "id");
  const row = { title: str(fd, "title"), minutes: num(fd, "minutes"), description: str(fd, "description") };
  if (!row.title) return { ok: false, error: "Give the lesson a title." };
  const video = str(fd, "video");
  return run(async (s) => {
    let lessonId = id;
    if (id) {
      const { error } = await s.from("lessons").update(row).eq("id", id);
      if (error) return { error };
    } else {
      const chapterId = str(fd, "chapter");
      const { data: last } = await s.from("lessons").select("position").eq("course_id", COURSE_ID).order("position", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await s.from("lessons").insert({ ...row, course_id: COURSE_ID, chapter_id: chapterId, position: (last?.position ?? 0) + 1 }).select("id").single();
      if (error) return { error };
      lessonId = data.id;
    }
    if (video) return s.from("lesson_media").upsert({ lesson_id: lessonId, video_url: video });
    return s.from("lesson_media").delete().eq("lesson_id", lessonId);
  });
}

export async function deleteLesson(id) {
  return run((s) => s.from("lessons").delete().eq("id", id));
}

export async function createSchool(_, fd) {
  const name = str(fd, "name");
  if (!name) return { ok: false, error: "Enter the school's name." };
  const slug = name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "SCH";
  const rand = () => Math.random().toString(36).slice(2, 5).toUpperCase();
  return run((s) => s.from("schools").insert({ name, city: str(fd, "city"), code: `${slug}-${rand()}`, teacher_code: `${slug}-T-${rand()}${rand()}` }));
}

export async function createClass(_, fd) {
  const row = { school_id: str(fd, "school"), name: str(fd, "name"), grade: num(fd, "grade"), teacher_id: str(fd, "teacher") };
  if (!row.school_id || !row.name || !row.grade) return { ok: false, error: "Pick a school, name the class and choose a grade." };
  return run((s) => s.from("classes").insert(row));
}

export async function grantAccess(studentId) {
  return run((s) => s.from("course_access").upsert({ student_id: studentId, course_id: COURSE_ID, source: "admin" }));
}
