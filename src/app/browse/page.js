import Link from "next/link";
import { ArrowRight, BookOpen, Crown, Gift, KeyRound, Play } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, IconTile, Ring, ViewAll } from "@/components/ui";
import { ContinueHero, ContinueWatchingCard, ModuleCard, PremiereCard, firstLesson } from "@/components/course";
import { canWatch, continueWatching, nextPremiere } from "@/lib/catalog";
import { getCourse, getLearningStats, getLeaderboard } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata = { title: "Dashboard · Beyond Tatva" };

export default async function Dashboard() {
  const [{ hasAccess, profile }, course, stats, board] = await Promise.all([getSession(), getCourse(), getLearningStats(), getLeaderboard()]);
  const next = nextPremiere(course);
  const resumeLesson = continueWatching(course, hasAccess);
  const current = course.modules.find((m) => m.progress < 100 && m.lessons.length && canWatch(m, hasAccess)) ?? course.modules[0];
  const done = course.lessons.filter((l) => l.done).length;
  const nextLesson = current ? firstLesson(current) : null;
  const firstModule = course.modules[0];
  const firstModuleLesson = firstLesson(firstModule);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";
  // Friendly nudge: the XP gap to the next rank, from the leaderboard (only real numbers).
  const me = board?.me;
  const ahead = me && board.top.find((p) => p.rank === me.rank - 1);
  const tip = !stats ? "Let's learn something new today." : me?.rank === 1 ? "You're #1. Keep it up!"
    : ahead ? `${ahead.xp - me.xp + 1} XP more and you pass ${ahead.me ? "the next learner" : ahead.name} for #${ahead.rank}!`
    : stats.xp ? `You have ${stats.xp} XP. Keep going!` : "Answer a quick check to earn your first XP.";
  const top3 = (board?.top ?? []).slice(0, 3);
  const bars = { 1: "h-24 bg-primary text-primary-fg", 2: "h-16 bg-primary-soft text-primary", 3: "h-14 bg-warning text-[#1e1b3a]" };
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean).map((p) => ({ ...p, bar: bars[p.rank] ?? bars[3], order: "" }));
  const rest = (board?.top ?? []).slice(3, 10);
  const earn = stats ? [
    { badge: "+10", label: "Each right quick check", value: stats.xp_breakdown?.checks ?? 0, chip: "bg-primary-soft text-primary" },
    { badge: "Quiz XP", label: "Pass a module quiz", value: stats.xp_breakdown?.quizzes ?? 0, chip: "bg-warning-soft text-warning" },
    { badge: "up to 50", label: "Each marked assignment", value: stats.xp_breakdown?.assignments ?? 0, chip: "bg-success-soft text-success" },
  ] : [];

  return (
    <Shell roles={["student"]} greeting>
      {profile?.role === "student" && <InstallPrompt />}
      {!hasAccess && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 lg:mb-6">
          <IconTile icon={Gift} />
          <div className="min-w-0 flex-1 basis-52">
            <div className="text-sm font-semibold">You&apos;re on the free plan: Module 0 is yours</div>
            <div className="text-sm text-muted">Unlock the other modules with your school&apos;s access key or a one-time payment.</div>
          </div>
          <Link href="/unlock" className="btn-primary w-full sm:w-auto"><KeyRound className="h-4 w-4" /> Unlock course</Link>
        </div>
      )}

      <section aria-label="Welcome" className="mb-4 flex flex-col gap-4 rounded-3xl bg-primary p-5 text-primary-fg sm:p-6 lg:mb-6">
        <div className="flex items-center gap-3">
          <Mascot />
          <p className="rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-sm font-semibold text-fg">{tip}</p>
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Hi {firstName}!</h1>
        {nextLesson && <Link href={`/watch/${course.id}?l=${nextLesson.n}`} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-[#3b2fc0] sm:self-start">
          <Play className="h-4 w-4 fill-current" /> {current.progress > 0 ? "Continue" : "Start"} · Lesson {nextLesson.idx ?? 1}
        </Link>}
      </section>

      {firstModule && <section className="mb-4 rounded-3xl border border-primary/20 bg-surface p-4 shadow-sm sm:flex sm:items-center sm:gap-5 sm:p-5" aria-labelledby="start-module-title">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconTile icon={BookOpen} size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Start here · Module {firstModule.n}</p>
            <h2 id="start-module-title" className="mt-0.5 text-lg font-semibold">{firstModule.title}</h2>
            <p className="mt-1 text-sm text-muted">Watch the first lesson and try the quick checks. You can find the quiz and assignment in Learning tasks.</p>
          </div>
        </div>
        {firstModuleLesson && <Link href={`/watch/${course.id}?l=${firstModuleLesson.n}`} className="btn-primary mt-4 w-full sm:mt-0 sm:w-auto"><Play className="h-4 w-4 fill-current" /> {firstModule.progress > 0 ? `Continue Module ${firstModule.n}` : `Start Module ${firstModule.n}`} <ArrowRight className="h-4 w-4" /></Link>}
      </section>}

      <div className="mb-5"><ContinueWatchingCard lesson={resumeLesson} courseId={course.id} /></div>

      <div className="mb-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-3 lg:mb-6">
        <Tile tone="primary-soft"><Ring value={course.progress} size={64} stroke={7}><span className="text-sm font-semibold">{course.progress}%</span></Ring><TileText title="Course" sub={`${done} of ${course.lessonCount} lessons`} /></Tile>
        {stats && <Tile tone="warning-soft"><span className="grid h-16 w-16 place-items-center rounded-full bg-warning text-base font-bold text-[#1e1b3a]">{stats.xp}</span><TileText title="XP" sub={board?.me ? `Rank #${board.me.rank} of ${board.players}` : "Earn XP to rank"} /></Tile>}
        {stats?.checks_answered > 0 && <Tile tone="success-soft"><Ring value={stats.checks_correct / stats.checks_answered * 100} size={64} stroke={7} tone="success"><span className="text-sm font-semibold">{Math.round(stats.checks_correct / stats.checks_answered * 100)}%</span></Ring><TileText title="Quick checks" sub={`${stats.checks_correct} of ${stats.checks_answered} right`} /></Tile>}
      </div>

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ContinueHero course={course} module={current} />
        {next ? <PremiereCard module={next} hasAccess={hasAccess} /> : (
          <Card title="All modules are out"><p className="text-sm text-muted">Finish the course to earn your certificate.</p></Card>
        )}
      </div>

      {(board || stats) && <section className="mt-6 grid gap-4 lg:gap-6 xl:grid-cols-2">
        {board && <div className="card rounded-3xl p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="text-lg font-semibold">Top learners</h2><span className="text-xs text-muted">{board.players} learners</span></div>
          {podium.length > 0 ? <ol className="grid grid-cols-3 items-end gap-2 text-center" aria-label="Top 3">
            {podium.map((p) => <li key={p.rank} className={p.order}>
              {p.rank === 1 && <Crown className="mx-auto mb-1 h-5 w-5 fill-warning text-warning" aria-hidden="true" />}
              <div className={`mb-1.5 truncate text-xs font-bold ${p.me ? "text-primary" : ""}`}>{p.me ? "You" : p.name}</div>
              <div className={`flex flex-col justify-center rounded-t-2xl font-bold ${p.bar}`}><span className={p.rank === 1 ? "text-2xl" : "text-xl"}>{p.rank}</span><span className="text-[11px] font-medium">{p.xp} XP</span></div>
            </li>)}
          </ol> : <p className="text-sm text-muted">Be the first: answer a quick check to earn XP.</p>}
          {rest.length > 0 && <ol className="mt-3 space-y-2">{rest.map((p) => <li key={`${p.rank}-${p.name}`} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${p.me ? "bg-primary-soft font-bold" : "bg-surface-2"}`}><span className="w-6 font-semibold text-muted">{p.rank}</span><span className="min-w-0 flex-1 truncate font-semibold">{p.me ? "You" : p.name}</span><span className="text-muted">{p.xp} XP</span></li>)}</ol>}
          {board.me && !board.top.some((p) => p.me) && <div className="mt-2 flex min-h-11 items-center gap-3 rounded-xl bg-primary-soft px-3 text-sm font-bold"><span className="w-6">{board.me.rank}</span><span className="flex-1">You</span><span>{board.me.xp} XP</span></div>}
          {board.me?.hidden && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">You&apos;re hidden from the leaderboard. <Link href="/profile" className="font-medium text-primary underline">Change this in Profile</Link></p>}
        </div>}
        {stats && <div className="card rounded-3xl p-5">
          <h2 className="mb-3 text-lg font-semibold">Ways to earn XP</h2>
          <ul className="space-y-3">{earn.map((e) => <li key={e.label} className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <span className={`min-w-[76px] rounded-lg py-1.5 text-center text-xs font-bold ${e.chip}`}>{e.badge}</span><span className="flex-1">{e.label}</span><span className="text-xs text-muted">{e.value} XP</span>
          </li>)}</ul>
        </div>}
      </section>}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Your journey</h2>
            <p className="text-sm text-muted">A new module premieres every Sunday at 10 AM.</p>
          </div>
          <ViewAll href="/course">Course page</ViewAll>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {course.modules.map((m) => (
            <div key={m.id} className="w-[78vw] shrink-0 snap-start sm:w-auto"><ModuleCard module={m} hasAccess={hasAccess} courseId={course.id} /></div>
          ))}
        </div>
      </section>
    </Shell>
  );
}

const tileTones = { "primary-soft": "bg-primary-soft", "warning-soft": "bg-warning-soft", "success-soft": "bg-success-soft" };
function Tile({ tone, children }) {
  return <div className={`flex items-center gap-3 rounded-3xl p-4 min-[360px]:flex-col min-[360px]:gap-2 min-[360px]:px-2 min-[360px]:text-center ${tileTones[tone]}`}>{children}</div>;
}
function TileText({ title, sub }) {
  return <div><div className="text-sm font-bold">{title}</div><div className="text-xs text-muted">{sub}</div></div>;
}
function Mascot() {
  return <span className="grid h-13 w-13 shrink-0 place-items-center rounded-full bg-accent" aria-hidden="true">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e1b3a" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /><path d="M8.5 14.5c1.8 1.8 5.2 1.8 7 0" /></svg>
  </span>;
}
