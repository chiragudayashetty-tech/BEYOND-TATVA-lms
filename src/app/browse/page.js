import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, Flame, Gift, KeyRound, Target, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, IconTile, LineChart, Progress, StatCard, ViewAll } from "@/components/ui";
import { ContinueHero, ModuleCard, PremiereCard, iconFor } from "@/components/course";
import Countdown from "@/components/Countdown";
import { canWatch, course, getModule, isReleased, nextPremiere } from "@/lib/catalog";
import { assignments, goals, me, schedule, scoreTrend } from "@/lib/demo";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard · Beyond Tatva" };

export default async function Dashboard() {
  const { hasAccess } = await getSession();
  const next = nextPremiere();
  const released = course.modules.filter((m) => isReleased(m)).length;
  const current = course.modules.find((m) => m.progress < 100 && canWatch(m, hasAccess)) ?? course.modules[0];
  const done = course.lessons.filter((l) => l.done).length;
  const due = assignments.filter((a) => a.status === "pending");

  return (
    <Shell roles={["student"]} greeting>
      {!hasAccess && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 lg:mb-6">
          <IconTile icon={Gift} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">You&apos;re on the free plan: AI 101 is yours</div>
            <div className="text-sm text-muted">Unlock modules 1–6 with your school&apos;s access key or a one-time payment.</div>
          </div>
          <Link href="/unlock" className="btn-primary"><KeyRound className="h-4 w-4" /> Unlock course</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Modules out" value={`${released} / ${course.modules.length}`} hint="One more every Sunday" icon={CalendarClock} />
        <StatCard label="Lessons done" value={`${done} / ${course.lessonCount}`} hint={`${course.progress}% of the course`} icon={CheckCircle2} tone="success" />
        <StatCard label="Assignments due" value={due.length} hint="1 due tomorrow" icon={ClipboardList} tone="warning" />
        <StatCard label="Level" value={me.level} hint={`${me.xp} / ${me.nextLevelXp} XP`} icon={Zap} />
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ContinueHero course={course} module={current} />
        {next ? <PremiereCard module={next} hasAccess={hasAccess} /> : (
          <Card title="All modules are out"><p className="text-sm text-muted">Finish the course to earn your certificate.</p></Card>
        )}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your 6-week journey</h2>
            <p className="text-sm text-muted">A new module premieres every Sunday at 6 PM.</p>
          </div>
          <ViewAll href="/course">Course page</ViewAll>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {course.modules.map((m) => (
            <div key={m.id} className="w-[78vw] shrink-0 snap-start sm:w-auto"><ModuleCard module={m} hasAccess={hasAccess} /></div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:gap-6 xl:grid-cols-3">
        <Card title="Today's schedule" action={<ViewAll href="/planner" />} className="xl:col-span-2">
          <ul className="divide-y divide-border">
            {schedule.map((s) => (
              <li key={s.title} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="w-16 shrink-0 text-sm"><div className="font-semibold">{s.time}</div><div className="text-xs text-muted">{s.end}</div></div>
                <span className="h-10 w-0.5 rounded-full bg-primary/30" />
                <IconTile icon={iconFor(getModule(s.module))} size="sm" tone={s.kind === "Live class" ? "primary" : "neutral"} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{s.title}</div><div className="text-xs text-muted">{s.host}</div></div>
                <Badge tone={s.kind === "Live class" ? "success" : "neutral"}>{s.kind}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col justify-between rounded-2xl bg-primary p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80"><Flame className="h-4 w-4" /> Current streak</div>
          <div className="my-4"><div className="font-display text-5xl font-semibold">{me.streak}</div><div className="text-sm text-white/80">days in a row</div></div>
          <div className="flex gap-1.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1"><span className={`h-7 w-full rounded-md ${i < 4 ? "bg-white" : "bg-white/20"}`} /><span className="text-[10px] text-white/70">{d}</span></div>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/80">
            {next ? <>Catch up before the next premiere in <Countdown to={next.release} compact />.</> : "Keep going to finish the course."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-3">
        <Card title="Weekly goals" action={<Target className="h-4 w-4 text-muted" />}>
          <ul className="space-y-5">
            {goals.map((g) => (
              <li key={g.title}>
                <div className="flex justify-between gap-3 text-sm"><span className="font-medium">{g.title}</span><span className="font-semibold">{g.value}%</span></div>
                <Progress value={g.value} className="mt-2 h-1.5" />
                <div className="mt-1.5 text-xs text-muted">{g.target}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Quiz performance" action={<Badge tone="success">+12% this month</Badge>} className="xl:col-span-2">
          <LineChart points={scoreTrend.points} labels={scoreTrend.labels} />
        </Card>
      </div>
    </Shell>
  );
}
