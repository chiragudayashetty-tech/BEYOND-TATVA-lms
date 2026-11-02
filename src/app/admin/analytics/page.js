import Link from "next/link";
import { ChartLine } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Bars, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { conversionPercent, funnelCounts, quizHealth, revenueByIstWeek } from "@/lib/analytics";
import { COURSE_ID } from "@/lib/catalog";

export const metadata = { title: "Analytics · Studio · Beyond Tatva" };

const nowIst = () => new Date(Date.now() + 330 * 60_000);
const utcBoundaryForIstDate = (date) => new Date(date.getTime() - 330 * 60_000).toISOString();
const percent = (value) => `${value}%`;
const rupees = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default async function AnalyticsPage({ searchParams }) {
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params?.days)) ? Number(params.days) : 30;
  const today = nowIst();
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1));
  const startAt = utcBoundaryForIstDate(from);
  const endAt = utcBoundaryForIstDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1)));
  const supabase = await createClient();
  const [leadsResult, profilesResult, modulesResult, lessonsResult, progressResult, accessResult, purchasesResult, quizzesResult, attemptsResult] = await Promise.all([
    supabase.from("leads").select("id, created_at").eq("course_id", COURSE_ID).gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("profiles").select("id, grade, signup_source, signup_utm, created_at").eq("role", "student").gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("chapters").select("id, position, is_free").eq("course_id", COURSE_ID),
    supabase.from("lessons").select("id, chapter_id").eq("course_id", COURSE_ID),
    supabase.from("lesson_progress").select("student_id, lesson_id, completed_at"), // all time: completion is cumulative
    supabase.from("course_access").select("student_id, granted_at").eq("course_id", COURSE_ID),
    supabase.from("purchases").select("created_at, amount_paise, status").gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("quizzes").select("id, title, chapter_id").eq("published", true),
    supabase.from("quiz_attempts").select("quiz_id, score, total, passed, created_at").gte("created_at", startAt).lt("created_at", endAt),
  ]);

  const readError = [leadsResult, profilesResult, modulesResult, lessonsResult, progressResult, accessResult, purchasesResult, quizzesResult, attemptsResult].some((result) => result.error);
  const leads = leadsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const chapters = modulesResult.data ?? [];
  const lessons = lessonsResult.data ?? [];
  const progress = progressResult.data ?? [];
  const accesses = accessResult.data ?? [];
  const purchases = purchasesResult.data ?? [];
  const quizzes = quizzesResult.data ?? [];
  const attempts = attemptsResult.data ?? [];

  const moduleZero = chapters.find((chapter) => chapter.is_free);
  const moduleZeroLessons = lessons.filter((lesson) => lesson.chapter_id === moduleZero?.id);
  const funnel = funnelCounts({ leads, profiles, progress, lessonIds: new Set(moduleZeroLessons.map((lesson) => lesson.id)), accesses });
  const sourceCounts = countBy(profiles, (profile) => profile.signup_source || profile.signup_utm?.utm_source || "Unknown");
  const gradeCounts = countBy(profiles, (profile) => profile.grade ? `Grade ${profile.grade}` : "Unknown");
  const sourceBars = toBars(sourceCounts);
  const gradeBars = toBars(gradeCounts);
  const revenue = revenueByIstWeek(purchases);
  const revenueBars = revenue.slice(-8).map(({ week, amountPaise }) => ({ label: week.slice(5), value: amountPaise / 100 }));
  const payingIds = new Set(accesses.map((access) => access.student_id));
  const completions = chapters.slice().sort((a, b) => a.position - b.position).map((chapter) => {
    const ids = new Set(lessons.filter((lesson) => lesson.chapter_id === chapter.id).map((lesson) => lesson.id));
    const count = [...payingIds].filter((id) => ids.size > 0 && [...ids].every((lessonId) => progress.some((row) => row.student_id === id && row.lesson_id === lessonId && row.completed_at))).length;
    return { label: `M${chapter.position}`, value: payingIds.size ? Math.round(count / payingIds.size * 100) : 0 };
  });
  const quizRows = quizHealth(quizzes, attempts);
  const totalRevenue = purchases.filter((row) => row.status !== "revoked").reduce((sum, row) => sum + (row.amount_paise ?? 0), 0);

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Business analytics" subtitle="See how students find and use the course. Funnel and sign-up counts use the selected date range.">
        <div className="flex min-h-11 items-center gap-1 rounded-xl border border-border p-1" aria-label="Date range">
          {[7, 30, 90].map((range) => <Link key={range} href={`/admin/analytics?days=${range}`} aria-current={days === range ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${days === range ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2"}`}>{range} days</Link>)}
        </div>
      </PageTitle>
      {readError && <p role="alert" className="mb-4 text-sm text-danger">Some data could not be loaded. Counts below may be incomplete.</p>}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads" value={funnel[0].count} hint={`Last ${days} days`} icon={ChartLine} />
        <StatCard label="Student sign-ups" value={funnel[1].count} hint={`Last ${days} days`} />
        <StatCard label="Full access" value={accesses.length} hint="All time (incl. school keys)" />
        <StatCard label="Revenue recorded" value={rupees(totalRevenue)} hint={`Last ${days} days`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Student funnel">
          {funnel.every((item) => item.count === 0) ? <Empty icon={ChartLine} title="No data yet" body="Leads and student activity will appear here." /> : <ol className="space-y-3">
            {funnel.map((item, index) => <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3">
              <span className="text-sm font-medium">{index + 1}. {item.label}</span><span className="flex items-center gap-2"><strong>{item.count}</strong>{item.conversion != null && <span className="text-xs text-muted">{item.conversion}% from previous</span>}</span>
            </li>)}
          </ol>}
        </Card>
        <Card title="Sign-ups by source">
          {sourceBars.length ? <Bars data={sourceBars} max={Math.max(...sourceBars.map((x) => x.value), 1)} valueLabel={(value) => `${value} students`} /> : <Empty icon={ChartLine} title="No data yet" body="Source tags will appear after students sign up from a tagged link." />}
        </Card>
        <Card title="Sign-ups by grade">
          {gradeBars.length ? <Bars data={gradeBars} max={Math.max(...gradeBars.map((x) => x.value), 1)} valueLabel={(value) => `${value} students`} /> : <Empty icon={ChartLine} title="No data yet" body="Student grades will appear here after sign-up." />}
        </Card>
        <Card title="Revenue by week">
          {revenueBars.length ? <Bars data={revenueBars} max={Math.max(...revenueBars.map((x) => x.value), 1)} valueLabel={(value) => rupees(value * 100)} /> : <Empty icon={ChartLine} title="No data yet" body="Recorded payments will appear here." />}
        </Card>
        <Card title="Module completion">
          {completions.length && payingIds.size ? <><p className="mb-2 text-xs text-muted">Share of {payingIds.size} students with full course access who completed every lesson.</p><Bars data={completions.map(({ label, value }) => ({ label, value }))} max={100} valueLabel={percent} /></> : <Empty icon={ChartLine} title="No data yet" body="Module completion will appear after students with full access finish lessons." />}
        </Card>
        <Card title="Quiz health">
          {quizRows.length ? <ul className="divide-y divide-border">{quizRows.map((quiz) => <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><span className="min-w-0 flex-1 text-sm font-medium">{quiz.title}</span><span className="text-right text-xs text-muted">{quiz.attempts} attempts · {quiz.passRate}% passed · {quiz.averageScore}% avg score</span></li>)}</ul> : <Empty icon={ChartLine} title="No data yet" body="Published quizzes will appear here." />}
        </Card>
      </div>
    </Shell>
  );
}

function countBy(rows, keyOf) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function toBars(counts) {
  return [...counts].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 8).map(([label, value]) => ({ label: label.length > 10 ? `${label.slice(0, 9)}…` : label, value }));
}
