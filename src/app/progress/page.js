import { CheckCircle2, Sparkles, Target, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, IconTile, PageTitle, Progress, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { isReleased } from "@/lib/catalog";
import { getCourse, getLearningStats } from "@/lib/data";

export const metadata = { title: "Progress · Beyond Tatva" };

export default async function ProgressPage() {
  const [course, stats] = await Promise.all([getCourse(), getLearningStats()]);
  const done = course.lessons.filter((l) => l.done).length;
  // Real counts from my_learning_stats (XP also includes quizzes and assignments, so it can't be used for accuracy).
  const answered = stats?.checks_answered ?? 0;
  const correct = stats?.checks_correct ?? 0;
  const accuracy = answered ? Math.round((correct / answered) * 100) : null;
  const released = course.modules.filter((m) => isReleased(m));

  return (
    <Shell roles={["student"]}>
      <PageTitle title="Your progress" subtitle="Everything here updates as you watch and answer." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Lessons completed" value={`${done} / ${course.lessonCount}`} hint={`${course.progress}% of the course`} icon={CheckCircle2} tone="success" />
        <StatCard label="Quick-check accuracy" value={accuracy == null ? "–" : `${accuracy}%`} hint={answered ? `${correct} of ${answered} correct` : "Answer one in a lesson"} icon={Target} />
        <StatCard label="XP" value={stats?.xp ?? 0} hint="Quizzes, modules, assignments, quick checks" icon={Zap} tone="warning" />
        <StatCard label="Quizzes passed" value={stats?.quizzes_passed ?? 0} hint="One quiz in every module" icon={Sparkles} tone="primary" />
      </div>

      <Card title="By module" className="mt-6">
        <ul className="space-y-4">
          {released.map((m) => (
            <li key={m.id} className="flex items-center gap-4">
              <IconTile icon={iconFor(m)} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">Module {m.n}: {m.title}</span>
                  <span className="font-semibold">{m.lessons.filter((l) => l.done).length}/{m.lessons.length}</span>
                </div>
                <Progress value={m.progress} tone={m.progress === 100 ? "success" : "primary"} className="mt-2 h-1.5" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Shell>
  );
}
