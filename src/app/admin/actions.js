"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COURSE_ID } from "@/lib/catalog";
import { VIDEO_HELP, parseVideo } from "@/lib/video";

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
  if (video && !parseVideo(video)) return { ok: false, error: `That video link won't play. ${VIDEO_HELP}` };
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

// Moves every course a duplicate account has (paid, key or admin) to the student's real account.
export async function moveAccess(_, fd) {
  const from = str(fd, "from");
  const to = str(fd, "to");
  if (!from || !to) return { ok: false, error: "Pick both accounts." };
  return run((s) => s.rpc("admin_move_access", { p_from: from, p_to: to }));
}

// ── Enrollments (payments happen on the website) ────────────────────────────

const statusText = { claimed: "Unlocked on the student's account.", pending: "Saved. It unlocks when the student signs in with that email or phone.",
  duplicate: "That reference was already recorded.", already_claimed: "That reference was already recorded and unlocked.", already_revoked: "That reference was refunded earlier." };

export async function addEnrollment(_, fd) {
  const email = str(fd, "email");
  const phone = str(fd, "phone");
  if (!email && !phone) return { ok: false, error: "Enter the student's email or the parent's phone." };
  const rupees = num(fd, "amount");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_record_purchase", {
    p_email: email, p_phone: phone, p_student_name: str(fd, "student"), p_parent_name: str(fd, "parent"),
    p_amount_paise: rupees ? Math.round(rupees * 100) : null, p_reference: str(fd, "reference"),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: statusText[data] ?? "Saved." };
}

export async function revokeEnrollment(reference) {
  return run((s) => s.rpc("admin_revoke_purchase", { p_reference: reference }));
}

export async function assignEnrollment(_, fd) {
  const purchase = str(fd, "purchase");
  const student = str(fd, "student");
  if (!purchase || !student) return { ok: false, error: "Pick a student." };
  return run((s) => s.rpc("admin_assign_purchase", { p_purchase: purchase, p_student: student }));
}

// ── Quizzes ─────────────────────────────────────────────────────────────────

export async function saveQuiz(_, fd) {
  const row = {
    chapter_id: str(fd, "chapter"),
    title: str(fd, "title"),
    pass_percent: num(fd, "pass") ?? 60,
    xp: num(fd, "xp") ?? 100,
    published: fd.get("published") === "on",
  };
  if (!row.chapter_id || !row.title) return { ok: false, error: "Give the quiz a title." };
  const id = str(fd, "id");
  return run((s) => (id ? s.from("quizzes").update(row).eq("id", id) : s.from("quizzes").insert(row)));
}

export async function deleteQuiz(id) {
  return run((s) => s.from("quizzes").delete().eq("id", id));
}

export async function saveQuestion(_, fd) {
  // Blank options are dropped; the "correct" radio refers to the typed list, so remap its index.
  const typed = fd.getAll("option").map((o) => String(o).trim());
  const picked = fd.get("correct") === null ? null : Number(fd.get("correct"));
  const options = typed.filter(Boolean);
  const correct = picked != null && typed[picked] ? typed.slice(0, picked).filter(Boolean).length : null;
  const row = { quiz_id: str(fd, "quiz"), position: num(fd, "position") ?? 0, prompt: str(fd, "prompt"), options, correct_index: correct, explanation: str(fd, "explanation") };
  if (!row.prompt) return { ok: false, error: "Write the question." };
  if (options.length < 2) return { ok: false, error: "Add at least two answer options." };
  if (correct == null || correct < 0 || correct >= options.length) return { ok: false, error: "Pick which option is correct." };
  const id = str(fd, "id");
  return run((s) => (id ? s.from("quiz_questions").update(row).eq("id", id) : s.from("quiz_questions").insert(row)));
}

export async function deleteQuestion(id) {
  return run((s) => s.from("quiz_questions").delete().eq("id", id));
}

// ── Assignments ─────────────────────────────────────────────────────────────

export async function saveAssignment(_, fd) {
  const row = {
    chapter_id: str(fd, "chapter"),
    title: str(fd, "title"),
    instructions: str(fd, "instructions"),
    allow_text: fd.get("allow_text") === "on",
    allow_link: fd.get("allow_link") === "on",
    allow_files: fd.get("allow_files") === "on",
    max_marks: num(fd, "max_marks") ?? 10,
    due_at: istToIso(str(fd, "due")),
    published: fd.get("published") === "on",
  };
  if (!row.chapter_id || !row.title) return { ok: false, error: "Give the assignment a title." };
  if (!row.allow_text && !row.allow_link && !row.allow_files) return { ok: false, error: "Allow at least one way to answer." };
  const id = str(fd, "id");
  return run((s) => (id ? s.from("assignments").update(row).eq("id", id) : s.from("assignments").insert(row)));
}

export async function deleteAssignment(id) {
  return run((s) => s.from("assignments").delete().eq("id", id));
}

export async function gradeSubmission(_, fd) {
  const back = fd.get("action") === "return";
  return run((s) => s.rpc("grade_submission", {
    p_submission: str(fd, "id"), p_marks: back ? null : num(fd, "marks"), p_feedback: str(fd, "feedback"), p_return: back,
  }));
}
