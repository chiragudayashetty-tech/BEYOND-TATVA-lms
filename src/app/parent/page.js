import { CheckCircle2, Info, Link2, Smartphone, Target, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Avatar, Badge, Card, Empty, IconTile, Progress, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { isReleased } from "@/lib/catalog";
import { getCourse } from "@/lib/data";
import { createClient, getSession } from "@/lib/supabase/server";
import LinkChild from "./LinkChild";

export const metadata = { title: "Parent · Beyond Tatva" };

const ago = (t) => {
  if (!t) return "Not started yet";
  const d = Math.floor((Date.now() - new Date(t).getTime()) / 86400000);
  return d === 0 ? "Active today" : d === 1 ? "Active yesterday" : `Last active ${d} days ago`;
};

export default async function ParentPage() {
  const [{ user }, course] = await Promise.all([getSession(), getCourse()]);
  const supabase = await createClient();

  let children = [];
  if (user && user.id !== "preview") {
    const { data: links } = await supabase.from("guardians").select("student_id").eq("parent_id", user.id);
    const ids = (links ?? []).map((l) => l.student_id);
    if (ids.length) {
      const [{ data: kids }, { data: progress }, { data: answers }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, grade").in("id", ids),
        supabase.from("lesson_progress").select("student_id, lesson_id, completed_at, updated_at").in("student_id", ids),
        supabase.from("checkpoint_answers").select("student_id, correct, created_at").in("student_id", ids),
      ]);
      children = (kids ?? []).map((k) => {
        const p = (progress ?? []).filter((r) => r.student_id === k.id);
        const a = (answers ?? []).filter((r) => r.student_id === k.id);
        const done = new Set(p.filter((r) => r.completed_at).map((r) => r.lesson_id));
        const last = [...p.map((r) => r.updated_at), ...a.map((r) => r.created_at)].sort().at(-1);
        return { ...k, done, answers: a.length, correct: a.filter((r) => r.correct).length, last };
      });
    }
  }

  return (
    <Shell roles={["parent"]} greeting>
      {children.length === 0 ? (
        <Empty icon={Link2} title="Link your child's account"
          body="Ask your child for the 6-letter parent code on their Profile page and enter it here. Linking also records your consent."
          action={<LinkChild />} />
      ) : children.map((k) => {
        const pct = course.lessonCount ? Math.round((k.done.size / course.lessonCount) * 100) : 0;
        return (
          <section key={k.id} className="mb-8">
            <div className="card mb-4 flex flex-wrap items-center gap-4 p-5">
              <Avatar name={k.full_name} size="h-14 w-14 text-lg" />
              <div className="flex-1">
                <h1 className="text-xl font-semibold">{k.full_name}</h1>
                <p className="text-sm text-muted">Grade {k.grade}</p>
              </div>
              <Badge tone={k.last ? "success" : "neutral"}>{ago(k.last)}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <StatCard label="Lessons completed" value={`${k.done.size} / ${course.lessonCount}`} hint={`${pct}% of the course`} icon={CheckCircle2} tone="success" />
              <StatCard label="Quick-check accuracy" value={k.answers ? `${Math.round((k.correct / k.answers) * 100)}%` : "–"} hint={`${k.answers} answered`} icon={Target} />
              <StatCard label="XP" value={k.correct * 10} icon={Zap} tone="warning" />
              <StatCard label="Phone screen time" value="–" hint="Needs the companion app" icon={Smartphone} />
            </div>

            <Card title={`${course.title}: modules`} className="mt-4">
              <ul className="space-y-4">
                {course.modules.filter((m) => isReleased(m)).map((m) => {
                  const d = m.lessons.filter((l) => k.done.has(l.id)).length;
                  return (
                    <li key={m.id} className="flex items-center gap-3">
                      <IconTile icon={iconFor(m)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3 text-sm"><span className="font-medium">Module {m.n}: {m.title}</span><span className="font-semibold">{d}/{m.lessons.length}</span></div>
                        <Progress value={m.lessons.length ? (d / m.lessons.length) * 100 : 0} className="mt-2 h-1.5" />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 flex gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
                <Info className="h-4 w-4 shrink-0" /> Phone-wide screen time will come from the Beyond Tatva companion app for Android, with your consent.
              </p>
            </Card>
          </section>
        );
      })}
    </Shell>
  );
}
