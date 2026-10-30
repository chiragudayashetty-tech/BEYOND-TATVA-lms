import { CheckCircle2, Target, Users } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Avatar, Badge, Card, Empty, IconTile, PageTitle, Progress, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { fmtPremiere, isReleased } from "@/lib/catalog";
import { getCourse } from "@/lib/data";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata = { title: "Teacher · Beyond Tatva" };

const daysSince = (t) => (t ? Math.floor((Date.now() - new Date(t).getTime()) / 86400000) : null);

export default async function TeacherPage() {
  const [{ user }, course] = await Promise.all([getSession(), getCourse()]);
  const supabase = await createClient();

  let classes = [];
  let students = [];
  if (user && user.id !== "preview") {
    const { data: cls } = await supabase.from("classes").select("id, name, grade").eq("teacher_id", user.id);
    classes = cls ?? [];
    if (classes.length) {
      const { data: enr } = await supabase.from("enrollments").select("student_id, class_id").in("class_id", classes.map((c) => c.id));
      const ids = [...new Set((enr ?? []).map((e) => e.student_id))];
      if (ids.length) {
        const [{ data: kids }, { data: progress }, { data: answers }] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", ids),
          supabase.from("lesson_progress").select("student_id, completed_at, updated_at").in("student_id", ids),
          supabase.from("checkpoint_answers").select("student_id, correct, created_at").in("student_id", ids),
        ]);
        students = (kids ?? []).map((k) => {
          const p = (progress ?? []).filter((r) => r.student_id === k.id);
          const a = (answers ?? []).filter((r) => r.student_id === k.id);
          const last = [...p.map((r) => r.updated_at), ...a.map((r) => r.created_at)].sort().at(-1);
          return { ...k, done: p.filter((r) => r.completed_at).length, answers: a.length, correct: a.filter((r) => r.correct).length, last };
        }).sort((x, y) => x.full_name.localeCompare(y.full_name));
      }
    }
  }

  const avgDone = students.length ? Math.round(students.reduce((a, s) => a + s.done, 0) / students.length) : 0;
  const answered = students.reduce((a, s) => a + s.answers, 0);
  const accuracy = answered ? Math.round((students.reduce((a, s) => a + s.correct, 0) / answered) * 100) : null;

  return (
    <Shell roles={["teacher"]} greeting>
      <PageTitle title={classes.map((c) => c.name).join(", ") || "My class"} subtitle={course.title} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Students" value={students.length} icon={Users} />
        <StatCard label="Average lessons done" value={`${avgDone} / ${course.lessonCount}`} icon={CheckCircle2} tone="success" />
        <StatCard label="Class accuracy" value={accuracy == null ? "–" : `${accuracy}%`} hint="In-video quick checks" icon={Target} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        {students.length === 0 ? (
          <Empty icon={Users} title={classes.length ? "No students yet" : "No class assigned yet"}
            body={classes.length ? "Students appear here after they sign up with your school code." : "Beyond Tatva will assign your class. It will show here once that's done."} />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-subtle">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Lessons</th>
                  <th className="px-5 py-3 font-medium">Accuracy</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const d = daysSince(s.last);
                  const status = d == null ? ["neutral", "Not started"] : d <= 2 ? ["success", "Active"] : d <= 6 ? ["warning", "Slipping"] : ["danger", "Inactive"];
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={s.full_name} size="h-8 w-8 text-xs" /><span className="font-medium">{s.full_name}</span></div></td>
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><Progress value={(s.done / Math.max(1, course.lessonCount)) * 100} className="h-1.5 w-24" /><span className="font-medium">{s.done}</span></div></td>
                      <td className="px-5 py-3 font-medium">{s.answers ? `${Math.round((s.correct / s.answers) * 100)}%` : "–"}</td>
                      <td className="px-5 py-3"><Badge tone={status[0]}>{status[1]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Card title="Modules">
          <ul className="space-y-3">
            {course.modules.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <IconTile icon={iconFor(m)} size="sm" tone={isReleased(m) ? "primary" : "neutral"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">Module {m.n}: {m.title}</div>
                  <div className="text-xs text-muted">{isReleased(m) ? `${m.lessons.length} lessons · out` : fmtPremiere(m.release)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
