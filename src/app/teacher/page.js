import { AlertTriangle, Clock, Download, Target, TrendingUp, Users } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Avatar, Badge, Card, IconTile, PageTitle, Progress, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { course, fmtPremiere, isReleased } from "@/lib/catalog";
import { students } from "@/lib/demo";

export const metadata = { title: "Teacher · Beyond Tatva" };

const hm = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;
const status = { active: ["success", "Active"], slipping: ["warning", "Slipping"], inactive: ["danger", "Inactive"] };

export default function TeacherPage() {
  const avg = (k) => Math.round(students.reduce((a, s) => a + s[k], 0) / students.length);
  const atRisk = students.filter((s) => s.status !== "active");
  return (
    <Shell roles={["teacher"]} greeting>
      <PageTitle title="Grade 9 · Section A" subtitle="St. Mary's School, Udupi">
        <button className="btn-secondary"><Download className="h-4 w-4" /> Export to Google Sheets</button>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Students" value={students.length} icon={Users} />
        <StatCard label="Average progress" value={`${avg("progress")}%`} icon={TrendingUp} tone="success" />
        <StatCard label="Average quiz score" value={`${avg("quiz")}%`} icon={Target} tone="warning" />
        <StatCard label="Learning per week" value={hm(avg("week"))} hint="Average per student" icon={Clock} />
      </div>

      {atRisk.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <span className="flex-1"><span className="font-semibold">{atRisk.length} students need a nudge:</span> {atRisk.map((s) => s.name).join(", ")}</span>
          <button className="btn-secondary py-2">Send reminder</button>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-subtle">
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium">Quiz avg</th>
                <th className="px-5 py-3 font-medium">This week</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.name} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} size="h-8 w-8 text-xs" /><div><div className="font-medium">{s.name}</div><div className="text-xs text-muted">Last active {s.last.toLowerCase()}</div></div></div></td>
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Progress value={s.progress} className="h-1.5 w-24" /><span className="font-medium">{s.progress}%</span></div></td>
                  <td className="px-5 py-3 font-medium">{s.quiz}%</td>
                  <td className="px-5 py-3">{hm(s.week)}</td>
                  <td className="px-5 py-3"><Badge tone={status[s.status][0]}>{status[s.status][1]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card title="AI for Students: modules">
          <ul className="space-y-3">{course.modules.map((m) => (<li key={m.id} className="flex items-center gap-3"><IconTile icon={iconFor(m)} size="sm" tone={isReleased(m) ? "primary" : "neutral"} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">Module {m.n}: {m.title}</div><div className="text-xs text-muted">{isReleased(m) ? `${m.lessons.length} lessons · live` : fmtPremiere(m.release)}</div></div></li>))}</ul>
        </Card>
      </div>
    </Shell>
  );
}
