import Link from "next/link";
import { ArrowRight, Crown, Gift, KeyRound } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, IconTile, Ring, ViewAll } from "@/components/ui";
import { ContinueHero, ModuleCard, PremiereCard } from "@/components/course";
import { QUIZ_TRIES, XP_RULES, canWatch, nextPremiere, nextStep, stepLink } from "@/lib/catalog";
import { getActivities, getCourse, getLearningStats, getLeaderboard } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata = { title: "Dashboard · Beyond Tatva" };

export default async function Dashboard() {
  const [{ hasAccess, profile }, course, stats, board, activities] = await Promise.all([getSession(), getCourse(), getLearningStats(), getLeaderboard(), getActivities()]);
  const next = nextPremiere(course);
  // One clear button: the same "next step" the course page and the lesson page show.
  const step = nextStep(course, hasAccess, activities);
  const go = stepLink(course.id, step);
  // The module shown in the big card below: the one the next lesson is in, else the first unfinished open one.
  const current = step.lesson ? step.module : course.modules.find((m) => m.progress < 100 && m.lessons.length && canWatch(m, hasAccess));
  const done = course.lessons.filter((l) => l.done).length;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";
  // Friendly nudge: the XP gap to the next rank, from the leaderboard (only real numbers).
  const me = board?.me;
  const ahead = me && board.top.find((p) => p.rank === me.rank - 1);
  const tip = !stats ? "Let's learn something new today." : me?.rank === 1 ? "You're #1. Keep it up!"
    : ahead ? `${ahead.xp - me.xp + 1} XP more and you pass ${ahead.me ? "the next learner" : ahead.name} for #${ahead.rank}!`
    : stats.xp ? `You have ${stats.xp} XP. Keep going!` : "Finish a video or take a quiz to earn your first XP.";
  const top3 = (board?.top ?? []).slice(0, 3);
  const bars = { 1: "h-24 bg-primary text-primary-fg", 2: "h-16 bg-primary-soft text-primary", 3: "h-14 bg-warning text-[#1e1b3a]" };
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean).map((p) => ({ ...p, bar: bars[p.rank] ?? bars[3], order: "" }));
  const rest = (board?.top ?? []).slice(3, 10);
  const earn = stats ? [
    { badge: `+${XP_RULES.quizAnswer}`, label: "Each right quiz answer", note: `${QUIZ_TRIES} tries per quiz. Your XP is the average of your tries.`, value: stats.xp_breakdown?.quizzes ?? 0, chip: "bg-warning-soft text-warning" },
    { badge: `+${XP_RULES.module}`, label: "Each module fully watched", note: "Finish every video in the module.", value: stats.xp_breakdown?.modules ?? 0, chip: "bg-primary-soft text-primary" },
    { badge: `up to ${XP_RULES.assignment}`, label: "Each marked assignment", note: "Full marks give all 50.", value: stats.xp_breakdown?.assignments ?? 0, chip: "bg-success-soft text-success" },
    { badge: `+${XP_RULES.quickCheck}`, label: "Each right quick check", note: "The questions inside a video.", value: stats.xp_breakdown?.checks ?? 0, chip: "bg-surface-2 text-muted" },
  ] : [];

  return (
    <Shell roles={["student"]} greeting>
      {profile?.role === "student" && <InstallPrompt />}
      {!hasAccess && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 lg:mb-6">
          <IconTile icon={Gift} />
          <div className="min-w-0 flex-1 basis-52">
            <div className="text-sm font-semibold">You&apos;re on the free plan: Module 0 is yours</div>
            <div className="text-sm text-muted">Unlock the other modules with your school&apos;s access key<span className="web-only"> or a one-time payment</span>.</div>
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
        {go && <div>
          <p className="mb-2 text-sm text-white/85">{step.lesson ? `${go.hint} · ${go.title}` : go.hint}</p>
          <Link href={go.href} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-[#3b2fc0] sm:inline-flex">
            {go.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>}
      </section>

      <div className={`mb-4 grid grid-cols-1 gap-3 lg:mb-6 ${stats?.checks_answered > 0 ? "min-[360px]:grid-cols-3" : "min-[360px]:grid-cols-2"}`}>
        <Tile tone="primary-soft"><Ring value={course.progress} size={64} stroke={7}><span className="text-sm font-semibold">{course.progress}%</span></Ring><TileText title="Progress" sub={`${done} of ${course.lessonCount} lessons done`} /></Tile>
        {stats && <Tile tone="warning-soft"><span className="grid h-16 w-16 place-items-center rounded-full bg-warning text-base font-bold text-[#1e1b3a]">{stats.xp}</span><TileText title="XP" sub={board?.me ? `Rank #${board.me.rank} of ${board.players}` : "Earn XP to rank"} /></Tile>}
        {stats?.checks_answered > 0 && <Tile tone="success-soft"><Ring value={stats.checks_correct / stats.checks_answered * 100} size={64} stroke={7} tone="success"><span className="text-sm font-semibold">{Math.round(stats.checks_correct / stats.checks_answered * 100)}%</span></Ring><TileText title="Quick checks" sub={`${stats.checks_correct} of ${stats.checks_answered} right`} /></Tile>}
      </div>

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-[1.4fr_1fr]">
        {current && <ContinueHero course={course} module={current} />}
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
          </ol> : <p className="text-sm text-muted">Be the first: finish a module or take a quiz to earn XP.</p>}
          {rest.length > 0 && <ol className="mt-3 space-y-2">{rest.map((p) => <li key={`${p.rank}-${p.name}`} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${p.me ? "bg-primary-soft font-bold" : "bg-surface-2"}`}><span className="w-6 font-semibold text-muted">{p.rank}</span><span className="min-w-0 flex-1 truncate font-semibold">{p.me ? "You" : p.name}</span><span className="text-muted">{p.xp} XP</span></li>)}</ol>}
          {board.me && !board.top.some((p) => p.me) && <div className="mt-2 flex min-h-11 items-center gap-3 rounded-xl bg-primary-soft px-3 text-sm font-bold"><span className="w-6">{board.me.rank}</span><span className="flex-1">You</span><span>{board.me.xp} XP</span></div>}
          {board.me?.hidden && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">You&apos;re hidden from the leaderboard. <Link href="/profile" className="font-medium text-primary underline">Change this in Profile</Link></p>}
        </div>}
        {stats && <div className="card rounded-3xl p-5">
          <h2 className="mb-3 text-lg font-semibold">How you earn XP</h2>
          <ul className="space-y-3">{earn.map((e) => <li key={e.label} className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <span className={`min-w-[76px] rounded-lg py-1.5 text-center text-xs font-bold ${e.chip}`}>{e.badge}</span><span className="flex-1">{e.label}<span className="block text-xs font-normal text-muted">{e.note}</span></span><span className="text-xs text-muted">{e.value} XP</span>
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
