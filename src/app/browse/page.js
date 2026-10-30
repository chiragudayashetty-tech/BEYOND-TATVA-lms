import Link from "next/link";
import { BookOpen, ClipboardList, Flame, Radio, Target, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, IconTile, LineChart, Progress, Ring, StatCard, ViewAll } from "@/components/ui";
import { ContinueHero, CourseCard, iconFor } from "@/components/course";
import { continueWatching, courses, getCourse } from "@/lib/catalog";
import { assignments, goals, me, schedule, scoreTrend } from "@/lib/demo";

export const metadata = { title: "Dashboard · Beyond Tatva" };

export default function Dashboard() {
  const due = assignments.filter((a) => a.status === "pending");
  const lessons = courses.flatMap((c) => c.lessons);
  const done = lessons.filter((l) => l.done).length;
  const inProgress = lessons.filter((l) => l.current).length;
  const pct = (n) => Math.round((n / lessons.length) * 100);

  return (
    <Shell roles={["student"]} greeting>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Courses in progress" value={continueWatching.length} hint={`${courses.length} available`} icon={BookOpen} />
        <StatCard label="Classes today" value={schedule.length} hint="Next at 4:00 PM" icon={Radio} tone="success" />
        <StatCard label="Assignments due" value={due.length} hint="1 due tomorrow" icon={ClipboardList} tone="warning" />
        <StatCard label="Level" value={me.level} hint={`${me.xp} / ${me.nextLevelXp} XP`} icon={Zap} tone="primary" />
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ContinueHero course={continueWatching[0]} />

        <Card title="Learning progress" action={<Badge>All courses</Badge>}>
          <div className="flex items-center gap-6">
            <Ring value={pct(done)} size={132}>
              <div>
                <div className="font-display text-3xl font-semibold">{pct(done)}%</div>
                <div className="text-xs text-muted">Completed</div>
              </div>
            </Ring>
            <ul className="flex-1 space-y-3 text-sm">
              {[
                ["Completed", pct(done), "bg-primary"],
                ["In progress", pct(inProgress), "bg-warning"],
                ["Not started", 100 - pct(done) - pct(inProgress), "bg-border"],
              ].map(([l, v, c]) => (
                <li key={l} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${c}`} />
                  <span className="flex-1 text-muted">{l}</span>
                  <span className="font-semibold">{v}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-3">
        <Card title="Today's schedule" action={<ViewAll href="/planner" />} className="xl:col-span-2">
          <ul className="divide-y divide-border">
            {schedule.map((s) => {
              const I = iconFor(getCourse(s.courseId));
              return (
                <li key={s.title} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="w-16 shrink-0 text-sm">
                    <div className="font-semibold">{s.time}</div>
                    <div className="text-xs text-muted">{s.end}</div>
                  </div>
                  <span className="h-10 w-0.5 rounded-full bg-primary/30" />
                  <IconTile icon={I} size="sm" tone={s.kind === "Live class" ? "primary" : "neutral"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    <div className="text-xs text-muted">{s.host}</div>
                  </div>
                  <Badge tone={s.kind === "Live class" ? "success" : "neutral"}>{s.kind}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex flex-col justify-between rounded-2xl bg-primary p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80"><Flame className="h-4 w-4" /> Current streak</div>
          <div className="my-4">
            <div className="font-display text-5xl font-semibold">{me.streak}</div>
            <div className="text-sm text-white/80">days in a row</div>
          </div>
          <div className="flex gap-1.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className={`h-7 w-full rounded-md ${i < 4 ? "bg-white" : "bg-white/20"}`} />
                <span className="text-[10px] text-white/70">{d}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/80">Learn for 10 minutes today to keep it going.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-3">
        <Card title="Study goals" action={<Target className="h-4 w-4 text-muted" />}>
          <ul className="space-y-5">
            {goals.map((g) => (
              <li key={g.title}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="font-semibold">{g.value}%</span>
                </div>
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

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <ViewAll href="/courses">All courses</ViewAll>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {courses.filter((c) => c.progress === 0).slice(0, 4).map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Due soon</h2>
          <ViewAll href="/assignments" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {due.map((a) => (
            <Link key={a.id} href="/assignments" className="card p-4 transition hover:border-primary/40">
              <div className="flex items-center justify-between">
                <Badge tone={a.priority === "High" ? "danger" : a.priority === "Medium" ? "warning" : "neutral"}>{a.priority} priority</Badge>
                <span className="text-xs text-muted">Due {a.due}</span>
              </div>
              <div className="mt-3 text-sm font-semibold">{a.title}</div>
              <div className="mt-1 text-xs text-muted">{getCourse(a.courseId).title}</div>
              <Progress value={a.progress} className="mt-3 h-1.5" />
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}
