"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, Check, CircleCheck, Lock, PlayCircle, Zap } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { Avatar, Badge } from "@/components/ui";
import { canWatch, isReleased } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";

const tabs = ["Overview", "Notes"];


export default function LessonView({ course, lesson, hasAccess, video, canSave }) {
  const [tab, setTab] = useState("Overview");
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(lesson.done);
  const [saveError, setSaveError] = useState("");

  // Progress and answers are saved to Supabase; RLS lets students write only their own rows.
  async function toggleDone() {
    const next = !done;
    setDone(next);
    if (!canSave) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("lesson_progress").upsert(
      { student_id: user.id, lesson_id: lesson.id, completed_at: next ? new Date().toISOString() : null, updated_at: new Date().toISOString() },
      { onConflict: "student_id,lesson_id" },
    );
    if (error) { setDone(!next); setSaveError("Couldn't save. Check your connection and try again."); }
  }

  async function saveAnswer(question, correct) {
    if (correct) setXp((x) => x + 10);
    if (!canSave) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("checkpoint_answers").insert({ student_id: user.id, lesson_id: lesson.id, question, correct });
  }
  const noteKey = `notes:${lesson.id}`;
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try { setNotes(localStorage.getItem(noteKey) ?? ""); } catch {}
  }, [noteKey]);

  useEffect(() => {
    if (saved) return;
    const id = setTimeout(() => { try { localStorage.setItem(noteKey, notes); } catch {} setSaved(true); }, 600);
    return () => clearTimeout(id);
  }, [notes, saved, noteKey]);

  const prev = course.lessons.find((l) => l.n === lesson.n - 1);
  const module = course.modules.find((m) => m.n === lesson.module);
  const nextRaw = course.lessons.find((l) => l.n === lesson.n + 1);
  const next = nextRaw && canWatch(course.modules.find((m) => m.n === nextRaw.module), hasAccess) ? nextRaw : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <Link href="/course" className="btn-ghost -ml-3 mb-3"><ArrowLeft className="h-4 w-4" /> {course.title}</Link>
        <VideoPlayer src={video} onAnswer={saveAnswer} />

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-primary">Module {module.n} · {module.title} · Lesson {lesson.idx} of {module.lessons.length}</div>
            <h1 className="mt-1 text-2xl font-semibold">{lesson.title}</h1>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name="Chirag Shetty" size="h-8 w-8 text-xs" />
              <div className="text-sm">
                <div className="font-medium">Chirag Shetty</div>
                <div className="text-xs text-muted">Founder, Beyond Tatva</div>
              </div>
              {xp > 0 && <Badge tone="warning"><Zap className="h-3 w-3" /> +{xp} XP earned</Badge>}
            </div>
          </div>
          <button onClick={toggleDone} className={done ? "btn-secondary text-success" : "btn-primary"}>
            {done ? <><CircleCheck className="h-4 w-4" /> Completed</> : <><Check className="h-4 w-4" /> Mark as complete</>}
          </button>
          {saveError && <p role="alert" className="w-full text-sm text-danger">{saveError}</p>}
        </div>

        <div className="mt-6 border-b border-border">
          <div className="flex gap-6">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${tab === t ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="py-5">
          {tab === "Overview" && (
            <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-muted">
              {lesson.description && <p>{lesson.description}</p>}
              <p>Watch for the <span className="font-medium text-fg">yellow markers</span> on the progress bar. The video pauses there for a quick question, and each correct answer earns 10 XP.</p>
              <p className="text-xs">Keyboard: Space to play or pause, ← and → to skip 10 seconds.</p>
            </div>
          )}
          {tab === "Notes" && (
            <div>
              <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={8}
                placeholder="Write down what you learned in your own words. Notes are saved on this device." className="input resize-y leading-relaxed" />
              <div className="mt-2 text-xs text-muted">{saved ? "Saved" : "Saving…"}</div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 border-t border-border pt-5">
          {prev ? <Link href={`/watch/${course.id}?l=${prev.n}`} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Previous</Link> : <span />}
          {next && <Link href={`/watch/${course.id}?l=${next.n}`} className="btn-primary">Next lesson <ArrowRight className="h-4 w-4" /></Link>}
        </div>
      </div>

      <aside className="card h-fit overflow-hidden xl:sticky xl:top-24">
        <div className="border-b border-border p-4">
          <div className="font-semibold">Course content</div>
          <div className="text-xs text-muted">{course.lessons.filter((l) => l.done).length} of {course.lessonCount} completed</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {course.modules.map((m) => {
            const open = canWatch(m, hasAccess);
            return (
              <div key={m.id} className="mb-2">
                <div className="flex items-center gap-1.5 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-subtle">
                  {!open && (isReleased(m) ? <Lock className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />)}
                  Module {m.n} · {m.title}
                </div>
                {open ? m.lessons.map((l, li) => (
                  <Link key={l.id} href={`/watch/${course.id}?l=${l.n}`}
                    className={`flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm transition ${l.n === lesson.n ? "bg-primary-soft text-primary" : "hover:bg-surface-2"}`}>
                    {l.done ? <CircleCheck className="h-4 w-4 shrink-0 text-success" /> : <PlayCircle className="h-4 w-4 shrink-0 opacity-60" />}
                    <span className="flex-1 font-medium">{li + 1}. {l.title}</span>
                    <span className="text-xs text-muted">{l.mins}m</span>
                  </Link>
                )) : (
                  <Link href={isReleased(m) ? "/unlock" : `/course#m${m.n}`} className="mx-2 block rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted hover:bg-surface-2">
                    {isReleased(m) ? "Unlock to watch" : `Premieres Sun ${new Date(m.release).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}, 6 PM`}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
