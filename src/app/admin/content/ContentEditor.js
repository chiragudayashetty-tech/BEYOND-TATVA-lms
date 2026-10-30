"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarClock, ChevronDown, CircleCheck, Film, Gift, Plus, Save, Trash2, Video } from "lucide-react";
import { Badge } from "@/components/ui";
import { deleteLesson, deleteModule, saveCourse, saveLesson, saveModule } from "../actions";

// "2026-11-01T12:30:00Z" → "2026-11-01T18:00" (IST wall time for datetime-local inputs)
const toIstInput = (iso) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 330 * 60000);
  return d.toISOString().slice(0, 16);
};

function Status({ state }) {
  if (!state) return null;
  return state.ok
    ? <span className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="h-4 w-4" /> Saved</span>
    : <span role="alert" className="text-sm text-danger">{state.error}</span>;
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function CourseForm({ course }) {
  const [state, action, pending] = useActionState(saveCourse, null);
  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Course details</h2><Status state={state} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title"><input name="title" className="input" defaultValue={course.title} required /></Field>
        <Field label="Price (₹, one time)"><input name="price" type="number" min={0} className="input" defaultValue={course.price} /></Field>
      </div>
      <Field label="Tagline"><input name="tagline" className="input" defaultValue={course.tagline} /></Field>
      <Field label="Description"><textarea name="description" rows={3} className="input" defaultValue={course.description} /></Field>
      <Field label="Hero video URL" hint="Plays muted on the course page and landing page."><input name="hero" className="input" defaultValue={course.hero ?? ""} placeholder="https://…" /></Field>
      <button disabled={pending} className="btn-primary"><Save className="h-4 w-4" /> {pending ? "Saving…" : "Save course"}</button>
    </form>
  );
}

function LessonForm({ lesson, chapterId, video, onDone }) {
  const [state, action, pending] = useActionState(async (prev, fd) => {
    const r = await saveLesson(prev, fd);
    if (r.ok && !lesson) onDone?.();
    return r;
  }, null);
  const [deleting, startDelete] = useTransition();
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_90px]">
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      {!lesson && <input type="hidden" name="chapter" value={chapterId} />}
      <input name="title" className="input" defaultValue={lesson?.title} placeholder="Lesson title" required aria-label="Lesson title" />
      <input name="minutes" type="number" min={0} className="input" defaultValue={lesson?.mins ?? ""} placeholder="Min" aria-label="Minutes" />
      <div className="sm:col-span-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <Video className="h-4 w-4 shrink-0 text-subtle" />
          <input name="video" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-subtle" defaultValue={video ?? ""} placeholder="Video URL (Bunny Stream, YouTube unlisted or MP4 link)" aria-label="Video URL" />
        </div>
      </div>
      <textarea name="description" rows={2} className="input sm:col-span-2" defaultValue={lesson?.description ?? ""} placeholder="What students will learn (shown under the video)" aria-label="Description" />
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button disabled={pending} className="btn-primary px-3 py-2">{pending ? "Saving…" : lesson ? "Save lesson" : "Add lesson"}</button>
        {lesson && (
          <button type="button" disabled={deleting} onClick={() => confirm(`Delete "${lesson.title}"? Student progress on it will be removed.`) && startDelete(() => deleteLesson(lesson.id))}
            className="btn-ghost px-3 py-2 text-danger"><Trash2 className="h-4 w-4" /> Delete</button>
        )}
        <Status state={state} />
      </div>
    </form>
  );
}

function ModuleEditor({ m, videos, open, onToggle }) {
  const [state, action, pending] = useActionState(saveModule, null);
  const [adding, setAdding] = useState(false);
  const [deleting, startDelete] = useTransition();
  const withVideo = m.lessons.filter((l) => videos[l.id]).length;

  return (
    <li className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">{m.n}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{m.title}</div>
          <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{m.release ? new Date(m.release).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "No date"}</span>
            <span className="inline-flex items-center gap-1"><Film className="h-3 w-3" />{withVideo}/{m.lessons.length} videos</span>
          </div>
        </div>
        {m.free && <Badge tone="success"><Gift className="h-3 w-3" /> Free</Badge>}
        <ChevronDown className={`h-4 w-4 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border bg-surface-2/50 p-4">
          <form action={action} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={m.id} />
            <Field label="Module title"><input name="title" className="input" defaultValue={m.title} required /></Field>
            <Field label="Premiere (IST)" hint="Students can watch from this moment."><input name="release" type="datetime-local" className="input" defaultValue={toIstInput(m.release)} /></Field>
            <div className="sm:col-span-2"><Field label="Short description"><input name="blurb" className="input" defaultValue={m.blurb} /></Field></div>
            <Field label="Thumbnail image URL"><input name="thumb" className="input" defaultValue={m.thumb ?? ""} placeholder="https://…" /></Field>
            <label className="flex items-center gap-3 self-end rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
              <input type="checkbox" name="free" defaultChecked={m.free} className="h-4 w-4 accent-[var(--primary)]" />
              Free for everyone with an account
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <button disabled={pending} className="btn-primary px-3 py-2"><Save className="h-4 w-4" /> {pending ? "Saving…" : "Save module"}</button>
              <button type="button" disabled={deleting} onClick={() => confirm(`Delete Module ${m.n} and all ${m.lessons.length} of its lessons?`) && startDelete(() => deleteModule(m.id))}
                className="btn-ghost px-3 py-2 text-danger"><Trash2 className="h-4 w-4" /> Delete module</button>
              <Status state={state} />
            </div>
          </form>

          <div>
            <div className="mb-2 text-sm font-semibold">Lessons</div>
            <div className="space-y-2">
              {m.lessons.map((l) => <LessonForm key={l.id} lesson={l} video={videos[l.id]} />)}
              {adding
                ? <LessonForm chapterId={m.id} onDone={() => setAdding(false)} />
                : <button onClick={() => setAdding(true)} className="btn-secondary w-full"><Plus className="h-4 w-4" /> Add lesson</button>}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function NewModule() {
  const [state, action, pending] = useActionState(saveModule, null);
  return (
    <form action={action} className="card grid gap-3 p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
      <Field label="New module title"><input name="title" className="input" placeholder="Module 7: …" required /></Field>
      <Field label="Premiere (IST)"><input name="release" type="datetime-local" className="input" /></Field>
      <button disabled={pending} className="btn-primary"><Plus className="h-4 w-4" /> {pending ? "Adding…" : "Add module"}</button>
      <div className="sm:col-span-3"><Status state={state} /></div>
    </form>
  );
}

export default function ContentEditor({ course, videos }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <ul className="space-y-3">
          {course.modules.map((m) => (
            <ModuleEditor key={m.id} m={m} videos={videos} open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} />
          ))}
        </ul>
        <NewModule />
      </div>
      <div className="space-y-4">
        <CourseForm course={course} />
        <div className="card p-5 text-sm">
          <h2 className="font-semibold">About videos</h2>
          <p className="mt-2 text-muted">Paste a video link into each lesson for now. Direct upload with smooth, no-buffer streaming arrives once Bunny Stream is connected.</p>
          <p className="mt-2 text-muted">Students only ever receive a lesson&apos;s video after its module premieres and they have access.</p>
        </div>
      </div>
    </div>
  );
}
