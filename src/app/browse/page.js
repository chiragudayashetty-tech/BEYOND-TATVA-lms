import Link from "next/link";
import { Gift, KeyRound, Medal } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, IconTile, Ring, ViewAll, Progress } from "@/components/ui";
import { ContinueHero, ModuleCard, PremiereCard } from "@/components/course";
import { canWatch, isReleased, nextPremiere } from "@/lib/catalog";
import { getCourse, getLearningStats, getLeaderboard } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata = { title: "Dashboard · Beyond Tatva" };

export default async function Dashboard() {
  const [{ hasAccess, profile }, course, stats, board] = await Promise.all([getSession(), getCourse(), getLearningStats(), getLeaderboard()]);
  const next = nextPremiere(course);
  const released = course.modules.filter((m) => isReleased(m)).length;
  const current = course.modules.find((m) => m.progress < 100 && m.lessons.length && canWatch(m, hasAccess)) ?? course.modules[0];
  const done = course.lessons.filter((l) => l.done).length;

  return (
    <Shell roles={["student"]} greeting>
      {profile?.role === "student" && <InstallPrompt />}
      {!hasAccess && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 lg:mb-6">
          <IconTile icon={Gift} />
          <div className="min-w-0 flex-1 basis-52">
            <div className="text-sm font-semibold">You&apos;re on the free plan: AI 101 is yours</div>
            <div className="text-sm text-muted">Unlock the other modules with your school&apos;s access key or a one-time payment.</div>
          </div>
          <Link href="/unlock" className="btn-primary w-full sm:w-auto"><KeyRound className="h-4 w-4" /> Unlock course</Link>
        </div>
      )}

      <section className="mb-5 flex items-start gap-3 rounded-2xl bg-primary-soft p-4 sm:p-5" aria-label="Welcome">
        <IconTile icon={Medal} />
        <div><h1 className="text-xl font-semibold">Hi {profile?.full_name?.trim().split(/\s+/)[0] || "there"}!</h1><p className="mt-1 text-sm text-muted">You have {stats?.xp ?? 0} XP. Earn more in quick checks, quizzes and assignments.</p></div>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4"><Ring value={course.progress} size={92} stroke={9}><span className="text-lg font-semibold">{course.progress}%</span></Ring><div><div className="font-semibold">Course</div><p className="text-sm text-muted">{done} of {course.lessonCount} lessons</p></div></Card>
        {stats && <Card className="flex items-center gap-4"><Ring value={Math.min(stats.xp, 1000) / 10} size={92} stroke={9} tone="warning"><span className="text-lg font-semibold">{stats.xp}</span></Ring><div><div className="font-semibold">XP</div><p className="text-sm text-muted">{board?.me ? `Rank #${board.me.rank} of ${board.players}` : "Earn XP to join the leaderboard"}</p></div></Card>}
        {stats?.checks_answered > 0 && <Card className="flex items-center gap-4"><Ring value={stats.checks_answered ? stats.checks_correct / stats.checks_answered * 100 : 0} size={92} stroke={9} tone="success"><span className="text-lg font-semibold">{Math.round(stats.checks_correct / stats.checks_answered * 100)}%</span></Ring><div><div className="font-semibold">Quick checks</div><p className="text-sm text-muted">{stats.checks_correct}/{stats.checks_answered} right</p></div></Card>}
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ContinueHero course={course} module={current} />
        {next ? <PremiereCard module={next} hasAccess={hasAccess} /> : (
          <Card title="All modules are out"><p className="text-sm text-muted">Finish the course to earn your certificate.</p></Card>
        )}
      </div>

      {board && <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card title="Top learners">
          <ol className="divide-y divide-border">
            {board.top.slice(0, 10).map((player) => <li key={`${player.rank}-${player.name}`} className={`flex min-h-12 items-center gap-3 py-2 ${player.me ? "rounded-lg bg-primary-soft px-2 font-semibold" : ""}`}>
              <span className="w-8 text-sm font-semibold text-muted">{player.rank <= 3 ? <Medal aria-label={`Rank ${player.rank}`} className={`h-5 w-5 ${player.rank === 1 ? "text-warning" : player.rank === 2 ? "text-muted" : "text-primary"}`} /> : `#${player.rank}`}</span><span className="min-w-0 flex-1 truncate">{player.me ? "You" : player.name}</span><span className="text-sm text-muted">{player.xp} XP</span>
            </li>)}
            {board.me && !board.top.some((player) => player.me) && <li className="mt-2 flex min-h-12 items-center gap-3 border-t border-border pt-3 font-semibold"><span className="w-8 text-sm text-muted">#{board.me.rank}</span><span className="flex-1">You</span><span className="text-sm text-muted">{board.me.xp} XP</span></li>}
          </ol>
          <p className="mt-4 text-xs text-muted">How to earn XP: 10 per right quick check · quiz XP when you pass · up to 50 per marked assignment.</p>
          {board.me?.hidden && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">You&apos;re hidden from the leaderboard. <Link href="/profile" className="font-medium text-primary underline">Change this in Profile</Link></p>}
        </Card>
        {stats && <Card title="Where your XP came from"><ul className="space-y-4">{[["Quick checks", stats.xp_breakdown?.checks ?? 0], ["Quizzes", stats.xp_breakdown?.quizzes ?? 0], ["Assignments", stats.xp_breakdown?.assignments ?? 0]].map(([label, value]) => <li key={label}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{label}</span><span className="font-semibold">{value} XP</span></div><Progress value={stats.xp ? value / stats.xp * 100 : 0} /></li>)}</ul></Card>}
      </section>}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Your journey</h2>
            <p className="text-sm text-muted">A new module premieres every Sunday at 6 PM.</p>
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
