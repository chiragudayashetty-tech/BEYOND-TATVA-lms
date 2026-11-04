import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { quizBadge, submissionBadge } from "@/components/activity";
import { getActivities, getCourse } from "@/lib/data";

export const metadata = { title: "Learning tasks · Beyond Tatva" };

export default async function ActivitiesPage() {
  const [course, activities] = await Promise.all([getCourse(), getActivities()]);
  const modules = course.modules.map((module) => ({
    module,
    quizzes: activities.quizzes.filter((quiz) => quiz.chapter_id === module.id),
    assignments: activities.assignments.filter((assignment) => assignment.chapter_id === module.id),
  })).filter(({ quizzes, assignments }) => quizzes.length || assignments.length);

  return (
    <Shell roles={["student"]}>
      <PageTitle title="Learning tasks" subtitle="Find your quizzes and assignments by module." />
      {modules.length === 0 ? (
        <Empty icon={ClipboardList} title="No tasks to do yet" body="Quizzes and assignments will show here when they are available to you." />
      ) : (
        <div className="space-y-6">
          {modules.map(({ module, quizzes, assignments }) => (
            <section key={module.id} aria-labelledby={`module-${module.n}`}>
              <h2 id={`module-${module.n}`} className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">Module {module.n} · {module.title}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {quizzes.length > 0 && <Card title="Quizzes" pad={false}>
                  <ul className="divide-y divide-border">
                    {quizzes.map((quiz) => <li key={quiz.id}>
                      <Link href={`/quiz/${quiz.id}`} className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <Sparkles className="h-5 w-5 shrink-0 text-warning" />
                        <span className="min-w-0 flex-1 font-medium">{quiz.title}</span>
                        {quizBadge(activities.best[quiz.id])}
                        <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />
                      </Link>
                    </li>)}
                  </ul>
                </Card>}
                {assignments.length > 0 && <Card title="Assignments" pad={false}>
                  <ul className="divide-y divide-border">
                    {assignments.map((assignment) => <li key={assignment.id}>
                      <Link href={`/assignments/${assignment.id}`} className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 font-medium">{assignment.title}</span>
                        {submissionBadge(activities.submissions[assignment.id], assignment)}
                        <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />
                      </Link>
                    </li>)}
                  </ul>
                </Card>}
              </div>
            </section>
          ))}
          <div className="card flex items-start gap-3 p-4 text-sm text-muted">
            <Badge tone="neutral">Files</Badge>
            <p>Lesson files and updates are coming soon.</p>
          </div>
        </div>
      )}
    </Shell>
  );
}
