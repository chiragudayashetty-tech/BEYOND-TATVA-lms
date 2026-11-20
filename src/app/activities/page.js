import Link from "next/link";
import { ChevronRight, ClipboardList, FileText, Lock, Newspaper, PenLine, Sparkles } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Empty, IconTile, PageTitle } from "@/components/ui";
import { Thumb } from "@/components/course";
import { quizBadge, submissionBadge } from "@/components/activity";
import StudyFiles from "./StudyFiles";
import { getActivities, getCourse, getModuleResources, getNewsletters } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";
import { nextFirstSunday } from "@/lib/first-sunday";

export const metadata = { title: "Study Kit · Beyond Tatva" };

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Stat({ icon, tone, value, label }) {
  return (
    <div className="card flex min-w-0 flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:p-4">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0">
        <div className="font-display text-xl font-semibold leading-none">{value}</div>
        <div className="mt-1 truncate text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function Row({ href, icon, tone, title, sub, badge }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 transition hover:border-primary/40">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        <span className="shrink-0">{badge}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Group({ title, count, children }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle">{title} <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px]">{count}</span></h3>
      {children}
    </div>
  );
}

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
  const allFiles = modules.reduce((n, m) => n + m.files.length, 0);
  const allQuizzes = modules.flatMap((m) => m.quizzes);
  const passed = allQuizzes.filter((q) => activities.best[q.id]?.passed).length;
  const allAssignments = modules.flatMap((m) => m.assignments);
  const handedIn = allAssignments.filter((a) => activities.submissions[a.id]).length;

  return (
    <Shell roles={["student"]}>
      <div className="min-w-0 overflow-x-clip">
        <PageTitle title="Study Kit" subtitle="Notes, quizzes and assignments for every module, in one place." />

        {modules.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Stat icon={FileText} tone="danger" value={allFiles} label={allFiles === 1 ? "Study file" : "Study files"} />
            <Stat icon={Sparkles} tone="warning" value={`${passed}/${allQuizzes.length}`} label="Quizzes passed" />
            <Stat icon={PenLine} tone="primary" value={`${handedIn}/${allAssignments.length}`} label="Handed in" />
          </div>
        )}

        <section aria-labelledby="newsletter" className="card mb-8 overflow-hidden">
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary-soft to-transparent p-4">
            <IconTile icon={Newspaper} />
            <div className="min-w-0 flex-1">
              <h2 id="newsletter" className="font-semibold">AI Newsletter</h2>
              <p className="text-xs text-muted">Every 1st Sunday{next && <> · next: <b className="text-fg">{fmt(next)}</b></>}</p>
            </div>
          </div>
          <div className="p-4 pt-3">
            {!hasAccess ? (
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted"><Lock className="h-4 w-4" /> Included with the full course. <Link href="/unlock" className="inline-flex min-h-11 items-center font-medium text-primary underline">Unlock it</Link></p>
            ) : newsletters.length ? (
              <StudyFiles trackable={false} files={newsletters.map((n) => ({ ...n, title: `${n.title} · ${fmt(n.issue_date)}` }))} />
            ) : (
              <p className="text-sm text-muted">The first issue is coming soon. It will show up here.</p>
            )}
          </div>
        </section>

        {modules.length === 0 ? (
          <Empty icon={ClipboardList} title="Nothing here yet" body="Notes, quizzes and assignments show up here when their module opens." />
        ) : (
          <div className="space-y-6">
            {modules.map(({ module, files, quizzes, assignments }) => (
              <section key={module.id} aria-labelledby={`module-${module.n}`} className="card overflow-hidden">
                <Link href={`/course/${module.n}`} className="flex items-center gap-3 border-b border-border p-3 transition hover:bg-surface-2 sm:p-4">
                  <Thumb module={module} className="aspect-video w-28 shrink-0 rounded-xl sm:w-36" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Module {module.n}</p>
                    <h2 id={`module-${module.n}`} className="line-clamp-2 font-semibold leading-snug">{module.title}</h2>
                    <p className="mt-0.5 text-xs text-muted">{[files.length && plural(files.length, "file"), quizzes.length && (quizzes.length === 1 ? "1 quiz" : `${quizzes.length} quizzes`), assignments.length && plural(assignments.length, "assignment")].filter(Boolean).join(" · ")}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
                </Link>
                <div className="space-y-5 p-3 sm:p-4">
                  {files.length > 0 && <Group title="Notes & files" count={files.length}><StudyFiles files={files} /></Group>}
                  {(quizzes.length > 0 || assignments.length > 0) && (
                    <Group title="Practice" count={quizzes.length + assignments.length}>
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {quizzes.map((quiz) => <Row key={quiz.id} href={`/quiz/${quiz.id}`} icon={Sparkles} tone="warning" title={quiz.title} sub="Quiz" badge={quizBadge(activities.best[quiz.id])} />)}
                        {assignments.map((a) => <Row key={a.id} href={`/assignments/${a.id}`} icon={PenLine} tone="primary" title={a.title} sub={a.due_at ? `Due ${fmt(a.due_at)}` : "Assignment"} badge={submissionBadge(activities.submissions[a.id], a)} />)}
                      </ul>
                    </Group>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
