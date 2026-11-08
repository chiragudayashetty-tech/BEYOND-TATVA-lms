"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, CircleCheck, ClipboardList, Lock, PlayCircle, Sparkles, Zap } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { Avatar, Badge } from "@/components/ui";
import { quizBadge, submissionBadge } from "@/components/activity";
import { canWatch, isComingSoon, isReleased } from "@/lib/catalog";
import { parseVideo, tracksProgress } from "@/lib/video";
import { createClient } from "@/lib/supabase/client";

const tabs = ["Overview", "Notes"];
export default function LessonView({ course, lesson, hasAccess, video, activities, canSave, userId }) {
  const [tab, setTab] = useState("Overview");
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(lesson.done);
  const [saveError, setSaveError] = useState("");
  const [watchedPct, setWatchedPct] = useState(lesson.progressPct ?? (lesson.secondsWatched > 0 ? null : 0));
  const [watchSeconds, setWatchSeconds] = useState(lesson.secondsWatched ?? 0);
  const [startAt, setStartAt] = useState(() => lesson.lastPositionSeconds > 10 && lesson.durationSeconds > 0 && lesson.lastPositionSeconds < lesson.durationSeconds * 0.95
    ? lesson.lastPositionSeconds : 0);
  const playerRef = useRef({ max: lesson.secondsWatched ?? 0, position: startAt, duration: lesson.durationSeconds || lesson.mins * 60 });

  const resumeNote = startAt > 0 ? `Resumed from ${Math.floor(startAt / 60)}:${String(startAt % 60).padStart(2, "0")}` : "";
  // Visited pages are kept in the browser for 30 s (next.config.mjs). When this lesson becomes complete,
  // refresh so the dashboard and progress show it right away instead of a cached copy. Not on every
  // 15 s heartbeat: that would re-render the page for nothing.
  const router = useRouter();
  const wasDone = useRef(lesson.done);
  const refreshDone = useCallback(async () => {
    if (!canSave || !userId) return;
    const { data } = await createClient().from("lesson_progress").select("completed_at").eq("student_id", userId).eq("lesson_id", lesson.id).maybeSingle();
    const nowDone = Boolean(data?.completed_at);
    setDone(nowDone);
    if (nowDone && !wasDone.current) router.refresh();
    wasDone.current = nowDone;
  }, [canSave, userId, lesson.id, router]);

  // Progress and answers go through checked database functions (save_progress / save_answer):
  // the database confirms the lesson is open for this student and caps watch time.
  const saveProgress = useCallback(async ({ seconds, position, duration } = {}) => {
    if (!canSave || !userId) return { error: null };
    const { error } = await createClient().rpc("save_progress", {
      p_lesson: lesson.id,
      p_seconds: seconds ?? null,
      p_position: position ?? null,
      p_duration: duration ?? null,
    });
    if (!error) await refreshDone();
    return { error };
  }, [canSave, userId, lesson.id, refreshDone]);

  const saveLatest = useCallback(async () => {
    const w = playerRef.current;
    if (!w.max && !w.position) return;
    setSaveError("");
    const { error } = await saveProgress({ seconds: Math.floor(w.max), position: Math.floor(w.position), duration: Math.floor(w.duration) || null });
    if (error) setSaveError("Couldn't save your progress. Check your connection and try again.");
  }, [saveProgress]);

  // A heartbeat saves measured position every 15 seconds. Pause and page exit save immediately.
  useEffect(() => {
    const timer = setInterval(saveLatest, 15_000);
    const onHide = () => { if (document.visibilityState === "hidden") void saveLatest(); };
    window.addEventListener("pagehide", saveLatest);
    document.addEventListener("visibilitychange", onHide);
    return () => { clearInterval(timer); window.removeEventListener("pagehide", saveLatest); document.removeEventListener("visibilitychange", onHide); };
  }, [saveLatest]);

  const onProgress = useCallback((seconds, duration) => {
    const w = playerRef.current;
    w.max = Math.max(w.max, Math.floor(seconds));
    setWatchSeconds(w.max);
    w.position = Math.floor(seconds);
    w.duration = Math.floor(duration);
    const total = duration || lesson.mins * 60;
    setWatchedPct(total > 0 ? Math.min(100, Math.round(w.max / total * 100)) : null);
  }, [lesson.mins]);
  const onPauseProgress = useCallback((seconds, duration) => {
    onProgress(seconds, duration);
    void saveLatest();
  }, [onProgress, saveLatest]);
  const autoTracked = tracksProgress(parseVideo(video));

  async function saveAnswer(question, correct) {
    if (correct) setXp((x) => x + 10);
    if (!canSave || !userId) return;
    const { error } = await createClient().rpc("save_answer", { p_lesson: lesson.id, p_question: question, p_correct: correct });
    if (!error) router.refresh(); // XP and leaderboard
  }
  const noteKey = `notes:${lesson.id}`;
  // The Notes tab is never server-rendered (Overview opens first), so reading storage here is safe.
  const [notes, setNotes] = useState(() => {
    try { return typeof window === "undefined" ? "" : localStorage.getItem(noteKey) ?? ""; } catch { return ""; }
  });
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (saved) return;
    const id = setTimeout(() => { try { localStorage.setItem(noteKey, notes); } catch {} setSaved(true); }, 600);
    return () => clearTimeout(id);
  }, [notes, saved, noteKey]);

  const prev = course.lessons.find((l) => l.n === lesson.n - 1);
  const mod = course.modules.find((m) => m.n === lesson.module);
  const moduleQuizzes = activities.quizzes.filter((quiz) => quiz.chapter_id === mod?.id);
  const moduleAssignments = activities.assignments.filter((assignment) => assignment.chapter_id === mod?.id);
  const nextRaw = course.lessons.find((l) => l.n === lesson.n + 1);
  const next = nextRaw && canWatch(course.modules.find((m) => m.n === nextRaw.module), hasAccess) ? nextRaw : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <Link href="/course" className="btn-ghost -ml-3 mb-3"><ArrowLeft className="h-4 w-4" /> {course.title}</Link>
        <VideoPlayer src={video} title={lesson.title} onAnswer={saveAnswer} onProgress={onProgress} onPauseProgress={onPauseProgress} startAt={startAt} />
        {resumeNote && <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted"><span>{resumeNote}</span><button type="button" className="font-medium text-primary underline" onClick={() => { playerRef.current.position = 0; setStartAt(-1); }}>Start over</button></div>}

        {(moduleQuizzes.length > 0 || moduleAssignments.length > 0) && <section className="mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="lesson-tasks-title">
          <h2 id="lesson-tasks-title" className="text-base font-semibold">After this video</h2>
          <p className="mt-1 text-sm text-muted">Continue with the quiz or assignment for this module.</p>
          <ul className="mt-3 divide-y divide-border">
            {moduleQuizzes.map((quiz) => <li key={quiz.id}>
              <Link href={`/quiz/${quiz.id}`} className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">
                <Sparkles className="h-5 w-5 shrink-0 text-warning" />
                <span className="min-w-0 flex-1 font-medium">{quiz.title}</span>
                {quizBadge(activities.best[quiz.id])}
                <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />
              </Link>
            </li>)}
            {moduleAssignments.map((assignment) => <li key={assignment.id}>
              <Link href={`/assignments/${assignment.id}`} className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">
                <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 font-medium">{assignment.title}</span>
                {submissionBadge(activities.submissions[assignment.id], assignment)}
                <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />
              </Link>
            </li>)}
          </ul>
        </section>}

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-primary">Module {mod.n} · {mod.title} · Lesson {lesson.idx} of {mod.lessons.length}</div>
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
          <div role="status" className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${done ? "bg-success-soft text-success" : "bg-surface-2 text-muted"}`}>
            {done ? <><CircleCheck className="h-4 w-4" /> Completed ✓</> : watchSeconds > 0 ? watchedPct == null ? <span title="The video length is unavailable, so a percentage cannot be calculated.">–</span> : `${watchedPct}% watched` : "Not started"}
          </div>
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
              {autoTracked
                ? <p>Your progress saves as you watch. The lesson completes automatically after you watch 90%. Quick questions inside the video earn 10 XP each.</p>
                : <p>Progress tracking is not available for this video. Your lesson status will update when tracking is supported.</p>}
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
                    {isReleased(m) ? "Unlock to watch" : isComingSoon(m) ? "Coming soon" : `Premieres Sun ${new Date(m.release).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}, 10 AM`}
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
