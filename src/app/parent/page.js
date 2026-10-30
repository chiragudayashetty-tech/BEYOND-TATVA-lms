import { Award, BookOpen, CalendarCheck, Clock, Info, Smartphone, Target } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Avatar, Badge, Bars, Card, IconTile, Progress, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { course, isReleased } from "@/lib/catalog";
import { child, me, week } from "@/lib/demo";

export const metadata = { title: "Parent · Beyond Tatva" };

const hm = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default function ParentPage() {
  const learn = week.reduce((a, d) => a + d.value, 0);
  const device = week.reduce((a, d) => a + d.device, 0);
  const started = course.modules.filter((m) => isReleased(m));

  return (
    <Shell roles={["parent"]} greeting>
      <div className="card mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={child.name} size="h-14 w-14 text-lg" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{child.name}</h1>
          <p className="text-sm text-muted">Grade {child.grade} · {child.school}</p>
        </div>
        <Badge tone="success">Active today</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Learning this week" value={hm(learn)} hint="+18% vs last week" icon={Clock} tone="success" />
        <StatCard label="Phone screen time" value={hm(device)} hint={`Avg ${hm(Math.round(device / 7))} a day`} icon={Smartphone} tone="warning" />
        <StatCard label="Quiz average" value={`${child.quizAvg}%`} hint="Top 10% of class" icon={Target} />
        <StatCard label="Attendance" value={`${me.attendance}%`} hint="Live classes this month" icon={CalendarCheck} tone="success" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Screen time" action={<span className="text-xs text-muted">Last 7 days</span>} className="scroll-mt-24" >
          <div id="screen-time" />
          <Bars data={week.map((d) => ({ label: d.label, value: d.value, extra: d.device - d.value }))} max={Math.max(...week.map((d) => d.device))} valueLabel={(v) => `${v} min learning`} />
          <div className="mt-4 flex flex-wrap gap-5 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Learning on Beyond Tatva</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-surface-2 ring-1 ring-border" /> Other apps on the phone</span>
          </div>
          <p className="mt-4 flex gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
            <Info className="h-4 w-4 shrink-0" /> Phone-wide screen time comes from the Beyond Tatva companion app on your child&apos;s Android phone, with your consent.
          </p>
        </Card>

        <Card title="AI for Students: modules">
          <div id="courses" className="scroll-mt-24" />
          <ul className="space-y-4">
            {started.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <IconTile icon={iconFor(c)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3 text-sm"><span className="font-medium">Module {c.n}: {c.title}</span><span className="font-semibold">{c.progress}%</span></div>
                  <Progress value={c.progress} tone={c.progress === 100 ? "success" : "primary"} className="mt-2 h-1.5" />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border p-3">
            <IconTile icon={Award} tone="warning" size="sm" />
            <div className="text-sm"><span className="font-semibold">Next premiere:</span> a new module every Sunday, 6 PM</div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3">
            <IconTile icon={BookOpen} size="sm" />
            <div className="text-sm">{child.lessons} lessons completed so far</div>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
