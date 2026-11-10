import Link from "next/link";
import { ArrowRight, ClipboardList, Lock, Newspaper, Sparkles } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, Empty, PageTitle } from "@/components/ui";
import ModuleResources from "@/components/ModuleResources";
import { quizBadge, submissionBadge } from "@/components/activity";
import { getActivities, getCourse, getModuleResources, getNewsletters } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";
import { nextFirstSunday } from "@/lib/first-sunday";

export const metadata = { title: "Study Kit · Beyond Tatva" };

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

// Everything a student needs, by module: PDFs and files, quizzes, assignments. Plus the monthly newsletter.
export default async function StudyKitPage() {
  const [course, activities, resources, newsletters, { hasAccess }] = await Promise.all([getCourse(), getActivities(), getModuleResources(), getNewsletters(), getSession()]);
  const modules = course.modules.map((module) => ({
    module,
    files: resources[module.id] ?? [],
    quizzes: activities.quizzes.filter((q) => q.chapter_id === module.id),
    assignments: activities.assignments.filter((a) => a.chapter_id === module.id),
  })).filter(({ files, quizzes, assignments }) => files.length || quizzes.length || assignments.length);
  const next = nextFirstSunday();

  return (
    <Shell roles={["student"]}>
      <PageTitle title="Study Kit" subtitle="Your PDFs, quizzes, assignments and the monthly AI newsletter, all in one place." />

      <section aria-labelledby="newsletter" className="mb-8">
        <Card pad={false}>
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Newspaper className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 id="newsletter" className="font-semibold">AI Newsletter</h2>
              <p className="text-sm text-muted">A new issue every <b className="text-fg">1st Sunday of the month</b>{next && <> · next one on {fmt(next)}</>}.</p>
            </div>
          </div>
          <div className="border-t border-border p-4 sm:p-5">
            {!hasAccess ? (
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted"><Lock className="h-4 w-4" /> Included with the full course. <Link href="/unlock" className="inline-flex min-h-11 min-w-11 items-center font-medium text-primary underline">Unlock it</Link></p>
            ) : newsletters.length ? (
              <ModuleResources files={newsletters.map((n) => ({ ...n, title: `${n.title} · ${fmt(n.issue_date)}` }))} />
            ) : (
              <p className="text-sm text-muted">The first issue arrives soon. We&apos;ll add it here.</p>
            )}
          </div>
        </Card>
      </section>

      {modules.length === 0 ? (
        <Empty icon={ClipboardList} title="Nothing here yet" body="PDFs, quizzes and assignments show up here when their module opens." />
      ) : (
        <div className="space-y-8">
          {modules.map(({ module, files, quizzes, assignments }) => (
            <section key={module.id} aria-labelledby={`module-${module.n}`}>
              <h2 id={`module-${module.n}`} className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">Module {module.n} · {module.title}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {files.length > 0 && <Card title="Materials" className="lg:col-span-2">
                  <ModuleResources files={files} />
                </Card>}
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
        </div>
      )}
    </Shell>
  );
}
