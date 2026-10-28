import AppShell, { Bar, SectionTitle, Stat } from "@/components/AppShell";
import ModuleCard from "@/components/ModuleCard";
import { modules, students } from "@/lib/mock";
import { teacherNav } from "@/lib/nav";

const hm = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default function TeacherPage() {
  const avg = (k) => Math.round(students.reduce((a, s) => a + s[k], 0) / students.length);
  return (
    <AppShell role="teacher" name="Mrs. D'Souza" nav={teacherNav}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-teal">St. Mary&apos;s School, Udupi</p>
          <h1 className="text-2xl font-bold">Grade 9 · Section A</h1>
        </div>
        <button className="btn-ghost">⬇ Export to Google Sheets</button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={students.length} />
        <Stat label="Avg progress" value={`${avg("progress")}%`} tone="text-teal" />
        <Stat label="Avg quiz score" value={`${avg("quiz")}%`} tone="text-yellow" />
        <Stat label="Avg learning / week" value={hm(avg("week"))} />
      </div>

      <div className="card mb-10 overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left font-ui text-muted">
            <tr className="border-b border-border">
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Progress</th>
              <th className="p-4 font-medium">Quiz avg</th>
              <th className="p-4 font-medium">Time this week</th>
              <th className="p-4 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.name} className="border-b border-border/50 last:border-0 hover:bg-surface-2/50">
                <td className="p-4 font-medium">{s.name}</td>
                <td className="p-4"><div className="flex items-center gap-3"><div className="w-28"><Bar value={s.progress} /></div>{s.progress}%</div></td>
                <td className="p-4">{s.quiz}%</td>
                <td className="p-4">{hm(s.week)}</td>
                <td className="p-4">
                  <span className={`chip ${s.last.includes("week") || s.last.includes("4") ? "bg-coral/15 text-coral" : "bg-teal/15 text-teal"}`}>{s.last}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionTitle>Courses for your class</SectionTitle>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
        {modules.map((m) => <ModuleCard key={m.id} m={m} />)}
      </div>
    </AppShell>
  );
}
