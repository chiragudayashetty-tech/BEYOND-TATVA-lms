import { CalendarCheck, Clock, Target, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Bars, Card, IconTile, LineChart, PageTitle, Progress, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { course, isReleased } from "@/lib/catalog";
import { me, scoreTrend, week } from "@/lib/demo";

export const metadata = { title: "Progress · Beyond Tatva" };

const hm = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default function ProgressPage() {
  const total = week.reduce((a, d) => a + d.value, 0);
  const started = course.modules.filter((m) => isReleased(m));
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Your progress" subtitle="How you're learning, week by week." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Learning this week" value={hm(total)} hint="+18% vs last week" icon={Clock} />
        <StatCard label="Quiz average" value="85%" hint="Up from 72%" icon={Target} tone="success" />
        <StatCard label="Attendance" value={`${me.attendance}%`} hint="23 of 25 live classes" icon={CalendarCheck} tone="success" />
        <StatCard label="Total XP" value={me.xp.toLocaleString("en-IN")} hint={`Level ${me.level}`} icon={Zap} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Minutes learned" action={<span className="text-xs text-muted">Last 7 days</span>}>
          <Bars data={week.map((d, i) => ({ label: d.label, value: d.value, active: i === 3 }))} valueLabel={(v) => `${v} min`} />
        </Card>
        <Card title="Quiz scores" action={<span className="text-xs text-muted">Last 2 months</span>}>
          <LineChart points={scoreTrend.points} labels={scoreTrend.labels} />
        </Card>
      </div>

      <Card title="By module" className="mt-6">
        <ul className="space-y-4">
          {started.map((c) => (
            <li key={c.id} className="flex items-center gap-4">
              <IconTile icon={iconFor(c)} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3 text-sm"><span className="font-medium">Module {c.n}: {c.title}</span><span className="font-semibold">{c.progress}%</span></div>
                <Progress value={c.progress} tone={c.progress === 100 ? "success" : "primary"} className="mt-2 h-1.5" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Shell>
  );
}
