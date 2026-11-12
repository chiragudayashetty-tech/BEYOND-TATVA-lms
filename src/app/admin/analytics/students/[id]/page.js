import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, Progress, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Student activity · Analytics · Beyond Tatva" };

const pct = (n, d) => d > 0 ? Math.round(n / d * 100) : null;
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }) : "–";
const weights = ["Lessons · 35", "Quizzes · 25", "Checkpoints · 10", "Assignments · 10", "PDFs and resources · 5", "Active days · 15"];

export default async function StudentActivityPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data, error }, { data: duplicateGroups }] = await Promise.all([
    supabase.rpc("admin_student_activity", { p_student_id: id }),
    supabase.rpc("admin_duplicate_candidates"),
  ]);
  if (error && /Student not found/i.test(error.message)) notFound();
  if (!data) return <Shell roles={["admin"]}><Empty title="Student activity unavailable" body="We couldn't load this student's activity. Please try again." /></Shell>;
  const summary = data.summary;
  if (!summary) notFound();
  const extraLogin = (duplicateGroups ?? []).flatMap((group) => group.accounts ?? []).find((account) => account.duplicate_of === id);
  const lessonScore = summary.lessons_total ? Math.min(summary.lessons_completed / summary.lessons_total, 1) * 35 : null;
  const quizScore = summary.quizzes_total ? Math.min((summary.quiz_avg_best_pct ?? 0) / 100, 1) * 25 : null;
  const checkScore = summary.checkpoints_answered ? summary.checkpoints_correct / summary.checkpoints_answered * Math.min(summary.checkpoints_answered / Math.max(summary.lessons_total, 1), 1) * 10 : null;
  const assignmentScore = summary.assignments_total ? Math.min(summary.assignments_submitted / summary.assignments_total, 1) * 10 : null;
  const resourceScore = summary.resources_total ? Math.min(summary.resources_opened / summary.resources_total, 1) * 5 : null;
  const activeScore = Math.min((summary.active_days_30 ?? 0) / 10, 1) * 15;
  const earned = [lessonScore, quizScore, checkScore, assignmentScore, resourceScore, activeScore].map((x) => x ?? 0);
  const dayMap = new Map((data.days ?? []).map((row) => [String(row.day).slice(0, 10), row.minutes ?? 0]));
  const today = new Date();
  const days = Array.from({ length: 60 }, (_, index) => {
    const day = new Date(today); day.setDate(day.getDate() - (59 - index));
    const key = day.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return { key, minutes: dayMap.get(key) ?? 0 };
  });
  const timeline = [...(data.timeline ?? [])].sort((a, b) => new Date(b.at) - new Date(a.at));
  const kindLabel = { lesson_completed: "Finished lesson", quiz_passed: "Passed quiz", quiz_failed: "Tried quiz", assignment_submitted: "Handed in assignment", resource_opened: "Opened a resource", course_access: "Course access added", signed_up: "Created an account" };

  return <Shell roles={["admin"]}>
    <PageTitle title={summary.full_name || "Student"} subtitle={[summary.school, summary.grade && `Grade ${summary.grade}`, `Signed up ${date(summary.signed_up_at)}`].filter(Boolean).join(" · ")}>
      <Link className="btn-secondary" href="/admin/analytics/students">All students</Link>
    </PageTitle>
    {extraLogin?.email && <p className="mb-5 rounded-xl border border-primary/20 bg-primary-soft p-3 text-sm"><span className="font-semibold">Also logs in with:</span> <span className="break-all">{extraLogin.email}</span></p>}
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Learning score" value={`${summary.score ?? 0}/100`} hint="Across six learning areas" />
      <StatCard label="Lessons finished" value={`${summary.lessons_completed}/${summary.lessons_total}`} hint={`${summary.watch_minutes ?? 0} minutes watched`} />
      <StatCard label="Quizzes passed" value={`${summary.quizzes_passed}/${summary.quizzes_total}`} hint={summary.quiz_avg_best_pct == null ? "No published quizzes" : `Average score ${summary.quiz_avg_best_pct}% (all tries)`} />
      <StatCard label="Assignments" value={`${summary.assignments_submitted}/${summary.assignments_total}`} hint={`${summary.assignments_graded} marked`} />
      <StatCard label="Resources opened" value={`${summary.resources_opened}/${summary.resources_total}`} hint={`${summary.resource_downloads} downloads`} />
      <StatCard label="Last active" value={summary.last_active ? date(summary.last_active) : <span title="No tracked learning activity yet">–</span>} hint={`${summary.active_days_30} active days in 30d`} />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Learning score breakdown" action={<details className="relative text-xs text-muted"><summary className="min-h-11 cursor-pointer list-none py-3">How the score works ⓘ</summary><div className="absolute right-0 z-10 mt-1 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg"><p>Each part is capped at its points:</p><ul className="mt-2 list-disc space-y-1 pl-4"><li>Lessons completed: 35</li><li>Quiz scores: 25 (average of the student&apos;s tries, 2 per quiz)</li><li>Checkpoints: 10</li><li>Assignments submitted: 10</li><li>PDFs and resources opened: 5</li><li>Active days in the last 30: 15 (full at 10 days)</li></ul></div></details>}>
        <div className="space-y-4">{weights.map((label, index) => {
          const values = [lessonScore, quizScore, checkScore, assignmentScore, resourceScore, activeScore];
          const maxima = [35, 25, 10, 10, 5, 15];
          const unknown = values[index] == null;
          return <div key={label}><div className="mb-1 flex justify-between gap-2 text-sm"><span>{label}</span><span>{unknown ? <span title="No eligible activities are available for this category">–</span> : `${Math.round(values[index])}/${maxima[index]}`}</span></div><Progress value={unknown ? 0 : values[index] / maxima[index] * 100} tone={index % 2 ? "success" : "primary"} /></div>;
        })}</div>
      </Card>
      <Card title="Daily learning · last 60 days">
        <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-12" role="list" aria-label="Minutes of activity by day">
          {days.map(({ key, minutes }) => <span key={key} role="listitem" title={`${key}: ${minutes} minutes`} className={`aspect-square rounded-sm ${minutes >= 30 ? "bg-primary" : minutes > 0 ? "bg-primary/50" : "bg-surface-2"}`} />)}
        </div><p className="mt-3 text-xs text-muted">Each square is one day. Darker means more tracked learning time.</p>
      </Card>
      <Card title="Lesson progress">
        {data.lessons?.length ? <div className="max-h-[28rem] space-y-2 overflow-y-auto">{data.lessons.map((lesson, index) => <div key={`${lesson.module}-${lesson.position}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3"><div className="min-w-0"><div className="font-medium">Module {lesson.module} · {lesson.lesson}</div><div className="text-xs text-muted">{lesson.minutes_watched} minutes watched</div></div><Badge tone={lesson.completed_at ? "success" : "neutral"}>{lesson.completed_at ? `Finished ${date(lesson.completed_at)}` : "Not finished"}</Badge></div>)}</div> : <Empty title="No lessons yet" body="Lesson progress will show here." />}
      </Card>
      <Card title="Quiz results">
        {data.quizzes?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-muted"><tr><th className="py-2">Quiz</th><th className="py-2">Attempts</th><th className="py-2">Best</th><th className="py-2">First try</th></tr></thead><tbody className="divide-y divide-border">{data.quizzes.map((quiz, i) => <tr key={`${quiz.quiz}-${i}`}><td className="py-3">M{quiz.module} · {quiz.quiz}</td><td className="py-3">{quiz.attempts ?? 0}</td><td className="py-3">{quiz.best_pct == null ? "–" : `${quiz.best_pct}%`}</td><td className="py-3">{quiz.first_try_passed == null ? "–" : quiz.first_try_passed ? "Passed" : "Not passed"}</td></tr>)}</tbody></table></div> : <Empty title="No quiz results" body="Quiz attempts will show here." />}
      </Card>
      <Card title="Assignments">
        {data.assignments?.length ? <div className="space-y-2">{data.assignments.map((assignment, i) => <div key={`${assignment.assignment}-${i}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-surface-2 p-3"><span>{assignment.assignment}</span><span className="text-sm text-muted">{assignment.marks == null ? assignment.status || "Not submitted" : `${assignment.marks}/${assignment.max_marks}`}</span></div>)}</div> : <Empty title="No assignments yet" body="Submissions and marks will show here." />}
      </Card>
      <Card title="PDFs and resources">
        {data.resources?.length ? <div className="space-y-2">{data.resources.map((resource, i) => <div key={`${resource.resource}-${i}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-surface-2 p-3"><span>Module {resource.module} · {resource.resource}</span><span className="text-sm text-muted">{resource.opens} opens · {resource.downloads} downloads</span></div>)}</div> : <Empty title="No resources opened" body="Resource views will appear here when tracked." />}
      </Card>
      <Card title="Activity timeline">
        {timeline.length ? <ol className="max-h-[28rem] divide-y divide-border overflow-y-auto">{timeline.map((event, i) => <li key={`${event.at}-${i}`} className="py-3"><div className="font-medium">{kindLabel[event.kind] ?? "Learning activity"}{event.detail ? ` · ${event.detail}` : ""}</div><div className="text-xs text-muted">{new Date(event.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</div></li>)}</ol> : <Empty title="No activity yet" body="The learning timeline will appear here." />}
      </Card>
    </div>
  </Shell>;
}
