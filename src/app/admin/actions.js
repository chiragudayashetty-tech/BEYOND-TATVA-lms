"use server";

import { revalidatePath, updateTag } from "next/cache";
import { COURSE_TAG } from "@/lib/data";
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
  if (error?.message.includes("courses_list_price_range")) return { ok: false, error: "The original price must be at least the price (or leave it empty)." };
  if (error?.message.includes("courses_price_range") || error?.message.includes("price_inr")) return { ok: false, error: "Price must be between ₹1 and ₹1,00,000." };
  if (error) return { ok: false, error: error.message.includes("row-level security") ? "Only an admin can do this. Sign in with your admin account." : error.message };
  updateTag(COURSE_TAG); // course content is cached across requests (lib/data.js)
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCourse(_, fd) {
  return run((s) => s.from("courses").update({
    title: str(fd, "title"),
    tagline: str(fd, "tagline"),
    description: str(fd, "description"),
    price_inr: num(fd, "price") || null, // empty or 0 is rejected by the database
    list_price_inr: num(fd, "list_price") || null,
    hero_url: str(fd, "hero"),
  }).eq("id", COURSE_ID));
}

// Price only (Studio home → Pricing). The website and both checkouts read it via /api/price.
export async function savePrice(_, fd) {
  const price = num(fd, "price");
  const list = num(fd, "list_price") || null;
  if (!price || price < 1) return { ok: false, error: "Price must be between ₹1 and ₹1,00,000." };
  if (list && list < price) return { ok: false, error: "The original price must be at least the price (or leave it empty)." };
  return run((s) => s.from("courses").update({ price_inr: price, list_price_inr: list }).eq("id", COURSE_ID));
}

export async function saveModule(_, fd) {
  const row = {
    title: str(fd, "title"),
    blurb: str(fd, "blurb"),
    release_at: istToIso(str(fd, "release")),
    is_free: fd.get("free") === "on",
    thumbnail_url: str(fd, "thumb"),
    batch_week: num(fd, "week") || null,
    batch1_week: num(fd, "week1") || null,
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

// Student data rights (DPDP): export everything we hold, or delete the account and its uploads.
export async function exportStudent(studentId) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_export_student", { p_student: studentId });
  return error ? { ok: false, error: error.message } : { ok: true, data };
}

export async function deleteStudent(studentId, confirmName) {
  const supabase = await createClient();
  const { data: files, error } = await supabase.rpc("admin_delete_student", { p_student: studentId, p_confirm_name: confirmName });
  if (error) return { ok: false, error: error.message };
  let filesNote = "";
  if (files?.length) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { error: rmError } = await createAdminClient().storage.from("submissions").remove(files);
      if (rmError) filesNote = ` Uploaded files were not removed (${rmError.message}); remove the folder ${studentId}/ in Supabase Storage.`;
    } catch {
      filesNote = ` Uploaded files were not removed; remove the folder ${studentId}/ in Supabase Storage.`;
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `Deleted.${filesNote}` };
}

// Teachers: revoke or restore access (ends course access and student visibility).
export async function setTeacherRevoked(teacherId, revoked) {
  return run((s) => s.rpc("admin_set_teacher_revoked", { p_teacher: teacherId, p_revoked: revoked }));
}

// Parent-phone match (unverified): Studio confirms the suggested student.
export async function approveSuggestion(purchaseId) {
  return run((s) => s.rpc("admin_approve_suggestion", { p_purchase: purchaseId }));
}

// ── Quizzes ─────────────────────────────────────────────────────────────────

export async function saveQuiz(_, fd) {
  const row = {
    chapter_id: str(fd, "chapter"),
    title: str(fd, "title"),
    pass_percent: num(fd, "pass") ?? 60,
    published: fd.get("published") === "on",
  };
  if (!row.chapter_id || !row.title) return { ok: false, error: "Give the quiz a title." };
  const id = str(fd, "id");
  return run((s) => (id ? s.from("quizzes").update(row).eq("id", id) : s.from("quizzes").insert(row)));
}

// Give a student both tries back on a quiz (admin_reset_quiz_attempts checks the admin role).
export async function resetQuizTries(quizId, studentId) {
  return run((s) => s.rpc("admin_reset_quiz_attempts", { p_quiz: quizId, p_student: studentId }));
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

// Leads. Deleting a lead also removes every other lead with the same phone and its CRM notes.
async function leadRpc(fn, args, label) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/pipeline", "layout");
  return { ok: true, message: `${label}: ${data ?? 0} lead${data === 1 ? "" : "s"} removed.` };
}
export async function deleteLeads(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, error: "Nothing selected." };
  return leadRpc("admin_delete_leads", { p_ids: ids }, "Deleted");
}
export async function clearLeads(confirm, source = null) {
  return leadRpc("admin_clear_leads", { p_confirm: confirm, p_course: COURSE_ID, p_source: source }, "Cleared");
}
export async function dedupeLeads() {
  return leadRpc("admin_dedupe_leads", { p_course: COURSE_ID }, "Duplicates removed");
}

// Offline leads (typed in or pasted).
export async function addLead(_, fd) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_add_lead", {
    p_phone: str(fd, "phone"), p_source: str(fd, "source") ?? "manual",
    p_parent_name: str(fd, "parent_name"), p_student_name: str(fd, "student_name"),
    p_grade: num(fd, "grade") || null, p_school_name: str(fd, "school_name"), p_note: str(fd, "note"), p_course: COURSE_ID,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/pipeline", "layout");
  return { ok: true, message: data === "saved" ? "Lead added." : "That phone is already a lead from this source." };
}
export async function importLeads(rows, source) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_import_leads", { p_rows: rows, p_source: source || "import", p_course: COURSE_ID });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/pipeline", "layout");
  return { ok: true, data };
}

// ── School outreach (outreach_schools; the School Outreach sheet syncs the same rows) ──

async function outreach(fn) {
  const supabase = await createClient();
  const { error } = await fn(supabase);
  if (error) return { ok: false, error: error.message.includes("row-level security") ? "Only an admin can do this. Sign in with your admin account." : error.message };
  revalidatePath("/admin/outreach");
  return { ok: true };
}
const outreachFields = (fd) => ({
  name: str(fd, "name"),
  area: str(fd, "area"),
  contact: str(fd, "contact"),
  phone: str(fd, "phone"),
  status: str(fd, "status"),
  next_step: str(fd, "next_step"),
  next_date: str(fd, "next_date"),
  notes: str(fd, "notes"),
});

export async function saveOutreachSchool(_, fd) {
  const row = outreachFields(fd);
  if (!row.name) return { ok: false, error: "Enter the school name." };
  const id = str(fd, "id");
  return outreach((s) => (id ? s.from("outreach_schools").update(row).eq("id", id) : s.from("outreach_schools").insert(row)));
}

// kind = "call" | "visit": bumps the counter and adds a dated line to the history.
export async function logOutreach(id, kind, note) {
  if (!["call", "visit"].includes(kind)) return { ok: false, error: "Unknown activity." };
  return outreach(async (s) => {
    const { data, error } = await s.from("outreach_schools").select("calls, visits, history").eq("id", id).single();
    if (error) return { error };
    const day = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
    const line = `${day}: ${kind}${note?.trim() ? ` – ${note.trim().slice(0, 200)}` : ""}`;
    const history = [line, data.history].filter(Boolean).join("\n").slice(0, 4000);
    const col = kind === "call" ? "calls" : "visits";
    return s.from("outreach_schools").update({ [col]: data[col] + 1, history }).eq("id", id);
  });
}

export async function deleteOutreachSchool(id) {
  return outreach((s) => s.from("outreach_schools").delete().eq("id", id));
}

// Studio → Today: one Log form for schools and leads.
//   school: a call/visit through logOutreach (WhatsApp counts as a call), then only the fields given.
//   lead:   admin_log_lead_contact (CRM note + lead fields; marks the lead 'studio' so the sheet picks it up).
const isDay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ? v : null);
export async function logContact(_, fd) {
  const id = str(fd, "id"), channel = str(fd, "channel"), note = str(fd, "note");
  const fields = { status: str(fd, "status"), next_step: str(fd, "next_step"), next_date: isDay(str(fd, "next_date")) };
  if (str(fd, "kind") === "school") {
    if (!["call", "visit", "whatsapp"].includes(channel)) return { ok: false, error: "Choose call, WhatsApp or visit." };
    const logged = await logOutreach(id, channel === "visit" ? "visit" : "call", channel === "whatsapp" ? `WhatsApp${note ? `: ${note}` : ""}` : note);
    if (!logged.ok) return logged;
    const changes = Object.fromEntries(Object.entries(fields).filter(([, v]) => v));
    const saved = Object.keys(changes).length ? await outreach((s) => s.from("outreach_schools").update(changes).eq("id", id)) : logged;
    if (!saved.ok) return saved;
  } else {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_log_lead_contact", {
      p_lead: id, p_channel: channel, p_note: note, p_status: fields.status, p_next_step: fields.next_step, p_next_date: fields.next_date,
      p_do_not_contact: fd.get("do_not_contact") === "on" ? true : null,
    });
    if (error) return { ok: false, error: error.message === "Admins only" ? "Only an admin can do this." : error.message };
  }
  revalidatePath("/admin/today");
  return { ok: true, message: "Saved. The Google Sheet updates within 5 minutes." };
}
