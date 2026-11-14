import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, CircleCheck, ClipboardList, Gift, KeyRound, Lock, PlayCircle, Sparkles } from "lucide-react";
import { quizBadge, submissionBadge } from "@/components/activity";
import Shell from "@/components/shell/Shell";
import { Badge, Progress, RichText } from "@/components/ui";
import { Thumb, firstLesson, moduleState } from "@/components/course";
import Countdown from "@/components/Countdown";
import ModuleResources from "@/components/ModuleResources";
import OfflineDownload from "@/components/OfflineDownload";
import { fmtPremiere, isComingSoon, quizOpen } from "@/lib/catalog";
import { getActivities, getCourse, getModuleResources } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";

const stateLabel = {
  open: ["success", "Available"], progress: ["primary", "In progress"], done: ["success", "Completed"],
  locked: ["neutral", "Locked"], upcoming: ["primary", "Upcoming"],
};

export async function generateMetadata({ params }) {
  const { n } = await params;
  return { title: `Module ${n} · Beyond Tatva` };
}

// One module: thumbnail, lessons, quiz, assignment, downloads and files. Opened by tapping a module on /course.
export default async function ModulePage({ params }) {
  const { n } = await params;
  const [{ user, hasAccess }, course, activities, resources] = await Promise.all([getSession(), getCourse(), getActivities(), getModuleResources()]);
  const m = course.modules.find((x) => String(x.n) === n);
  if (!m) notFound();
  const i = course.modules.indexOf(m);
  const prev = course.modules[i - 1], nextMod = course.modules[i + 1];
  const state = moduleState(m, hasAccess);
  const playable = state !== "upcoming" && state !== "locked";
  const quiz = activities.quizzes.find((q) => q.chapter_id === m.id);
  const assignments = activities.assignments.filter((a) => a.chapter_id === m.id);
  const quizDue = state === "done" && quiz && quizOpen(activities.best[quiz.id]);

  return (
    <Shell roles={["student", "teacher"]}>
      <Link href="/course" className="btn-ghost -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> All modules</Link>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-3 lg:sticky lg:top-20">
          <Thumb module={m} className="aspect-video rounded-2xl" dim={!playable}>
            {playable && m.lessons.length > 0 && (
              <Link href={`/watch/${course.id}?l=${firstLesson(m).n}`} aria-label={`Play module ${m.n}`} className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-[#0f172a] shadow-lg"><PlayCircle className="h-8 w-8" strokeWidth={1.75} /></span>
              </Link>
            )}
            {!playable && <span className="absolute inset-0 m-auto grid h-12 w-12 place-items-center rounded-full bg-black/55 text-white"><Lock className="h-5 w-5" /></span>}
          </Thumb>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-subtle">Module {m.n}</span>
              <Badge tone={stateLabel[state][0]}>{stateLabel[state][1]}</Badge>
              {m.free && <Badge tone="success"><Gift className="h-3 w-3" /> Free</Badge>}
            </div>
            <h1 className="mt-1 text-2xl font-semibold">{m.title}</h1>
            {m.blurb && <RichText text={m.blurb} className="mt-1 text-sm text-muted" />}
            <p className="mt-2 text-xs text-muted">
              {state === "upcoming" ? (isComingSoon(m) ? "Coming soon" : <>Opens {fmtPremiere(m.release)} · in <span className="font-semibold text-fg"><Countdown to={m.release} compact /></span></>)
                : m.lessons.length ? `${m.lessons.length} ${m.lessons.length === 1 ? "lesson" : "lessons"} · ${m.mins} min` : "Lessons coming soon"}
            </p>
            {(state === "progress" || state === "done") && <div className="mt-2 flex items-center gap-2"><Progress value={m.progress} tone={state === "done" ? "success" : "primary"} className="h-1.5 flex-1" /><span className="text-xs font-medium">{m.progress}%</span></div>}
          </div>
          <div className="flex flex-wrap gap-2">
            {quizDue && <Link href={`/quiz/${quiz.id}`} className="btn-primary w-full sm:w-auto"><Sparkles className="h-4 w-4" /> Take the quiz</Link>}
            {playable && m.lessons.length > 0 && (
              <Link href={`/watch/${course.id}?l=${firstLesson(m).n}`} className={`${quizDue || state === "done" ? "btn-secondary" : "btn-primary"} w-full sm:w-auto`}>
                <PlayCircle className="h-4 w-4" /> {state === "done" ? "Watch again" : state === "progress" ? "Continue module" : `Start Module ${m.n}`}
              </Link>
            )}
            {state === "locked" && <Link href="/unlock" className="btn-primary w-full sm:w-auto"><KeyRound className="h-4 w-4" /> Unlock module {m.n}</Link>}
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <h2 className="px-1 pb-2 font-semibold">What&apos;s inside</h2>
          {m.lessons.length === 0 && !quiz && !assignments.length ? <p className="px-1 text-sm text-muted">Lessons coming soon.</p> : (
            <ul className="space-y-1">
              {m.lessons.map((l, li) => {
                const Row = playable ? Link : "div";
                return (
                  <li key={l.id}>
                    <Row {...(playable ? { href: `/watch/${course.id}?l=${l.n}` } : {})}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm ${playable ? "hover:bg-surface-2" : "text-subtle"} ${l.current ? "bg-primary-soft" : ""}`}>
                      {l.done ? <CircleCheck className="h-4 w-4 text-success" /> : playable ? <PlayCircle className="h-4 w-4 text-primary" /> : <Lock className="h-3.5 w-3.5" />}
                      <span className="flex-1 font-medium">{li + 1}. {l.title}</span>
                      {l.current && <Badge tone="primary">Up next</Badge>}
                      <span className="text-xs text-muted">{l.mins} min</span>
                    </Row>
                  </li>
                );
              })}
              {quiz && (
                <li><Link href={`/quiz/${quiz.id}`} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-surface-2">
                  <Sparkles className="h-4 w-4 text-warning" /><span className="flex-1 font-medium">{quiz.title}</span>{quizBadge(activities.best[quiz.id])}
                </Link></li>
              )}
              {assignments.map((a) => (
                <li key={a.id}><Link href={`/assignments/${a.id}`} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-surface-2">
                  <ClipboardList className="h-4 w-4 text-primary" /><span className="flex-1 font-medium">{a.title}</span>{submissionBadge(activities.submissions[a.id], a)}
                </Link></li>
              ))}
            </ul>
          )}
          {playable && m.lessons.length > 0 && (
            <OfflineDownload userId={user?.id} label={m.lessons.length > 1 ? `Download module (${m.lessons.length} videos)` : "Download for offline"}
              lessons={m.lessons.map((l) => ({ id: l.id, n: l.n, title: l.title, mins: l.mins, courseId: course.id, module: m.n, moduleTitle: m.title }))} />
          )}
          {playable && <ModuleResources files={resources[m.id]} />}
        </div>
      </div>

      <nav className="mt-6 grid grid-cols-2 gap-3" aria-label="Other modules">
        {prev ? <Link href={`/course/${prev.n}`} className="card flex min-h-12 items-center gap-2 p-3 text-sm"><ArrowLeft className="h-4 w-4 shrink-0" /><span className="truncate">Module {prev.n}</span></Link> : <span />}
        {nextMod && <Link href={`/course/${nextMod.n}`} className="card flex min-h-12 items-center justify-end gap-2 p-3 text-sm"><span className="truncate">Module {nextMod.n}</span><ChevronRight className="h-4 w-4 shrink-0" /></Link>}
      </nav>
    </Shell>
  );
}
