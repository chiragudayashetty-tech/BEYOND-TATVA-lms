import Link from "next/link";
import { ChartLine } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Bars, Card, Empty, PageTitle, StatCard, Progress } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getInsights } from "@/lib/data";
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
  const [leadsResult, profilesResult, modulesResult, lessonsResult, progressResult, accessResult, purchasesResult, quizzesResult, attemptsResult, insights] = await Promise.all([
    supabase.from("leads").select("id, created_at").eq("course_id", COURSE_ID).gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("profiles").select("id, grade, signup_source, signup_utm, created_at").eq("role", "student").gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("chapters").select("id, position, is_free").eq("course_id", COURSE_ID),
    supabase.from("lessons").select("id, chapter_id").eq("course_id", COURSE_ID),
    fetchAll((from, to) => supabase.from("lesson_progress").select("student_id, lesson_id, completed_at").order("student_id").order("lesson_id").range(from, to)), // all time: completion is cumulative
    supabase.from("course_access").select("student_id, granted_at").eq("course_id", COURSE_ID),
    supabase.from("purchases").select("created_at, amount_paise, status").gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("quizzes").select("id, title, chapter_id").eq("published", true),
    supabase.from("quiz_attempts").select("quiz_id, score, total, passed, created_at").gte("created_at", startAt).lt("created_at", endAt),
    getInsights(days),
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

  // Module 0 = every free module's lessons (same rule as the pipeline and sheet sync).
  const freeChapterIds = new Set(chapters.filter((chapter) => chapter.is_free).map((chapter) => chapter.id));
  const moduleZeroLessonIds = new Set(lessons.filter((lesson) => freeChapterIds.has(lesson.chapter_id)).map((lesson) => lesson.id));
  const funnel = funnelCounts({ leads, profiles, progress, lessonIds: moduleZeroLessonIds, accesses });
  const sourceCounts = countBy(profiles, (profile) => profile.signup_source || profile.signup_utm?.utm_source || "Unknown");
  const gradeCounts = countBy(profiles, (profile) => profile.grade ? `Grade ${profile.grade}` : "Unknown");
  const sourceBars = toBars(sourceCounts);
  const gradeBars = toBars(gradeCounts);
  const revenue = revenueByIstWeek(purchases);
  const revenueBars = revenue.slice(-8).map(({ week, amountPaise }) => ({ label: week.slice(5), value: amountPaise / 100 }));
  const payingIds = new Set(accesses.map((access) => access.student_id));
  const completions = moduleCompletion({ chapters, lessons, progress, payingIds });
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
          {completions.some((row) => row.base > 0) ? <><p className="mb-2 text-xs text-muted">Free modules: share of students who opened the module and finished every lesson. Paid modules: share of the {payingIds.size} students with full access who finished every lesson.</p><Bars data={completions.map(({ label, value }) => ({ label, value }))} max={100} valueLabel={percent} /></> : <Empty icon={ChartLine} title="No data yet" body="Module completion will appear after students with full access finish lessons." />}
        </Card>
        <Card title="Quiz health">
          {quizRows.length ? <ul className="divide-y divide-border">{quizRows.map((quiz) => <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><span className="min-w-0 flex-1 text-sm font-medium">{quiz.title}</span><span className="text-right text-xs text-muted">{quiz.attempts} attempts · {quiz.passRate}% passed · {quiz.averageScore}% avg score</span></li>)}</ul> : <Empty icon={ChartLine} title="No data yet" body="Published quizzes will appear here." />}
        </Card>
      </div>
      <section className="mt-8"><h2 className="mb-4 text-xl font-semibold">Insights</h2><InsightsSection insights={insights} /></section>
    </Shell>
  );
}

function InsightsSection({ insights }) {
  if (!insights) return <Card><Empty title="Insights unavailable" body="We couldn't load these details just now. Please try again later." /></Card>;
  const engagement = insights.engagement;
  const fixFirst = new Set((insights.lessons ?? []).filter((row) => row.started >= 3).slice().sort((a, b) => a.finished / a.started - b.finished / b.started).slice(0, 3).map((row) => `${row.module}-${row.lesson}`));
  const sources = (insights.sources ?? []).slice().sort((a, b) => b.paid - a.paid);
  return <div className="space-y-5">
    <Card title="Engagement">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Active this week" value={`${engagement.active_7d} of ${engagement.students}`} />
        <StatCard label="Active this month" value={`${engagement.active_30d} of ${engagement.students}`} />
        <StatCard label="Avg minutes per active student (7 days)" value={engagement.minutes_per_active_7d} />
        <Link href="/admin/pipeline?stalled=1" className="rounded-2xl focus-visible:ring-2 focus-visible:ring-primary"><StatCard label="Paid but stopped 14+ days" value={engagement.stopped_paid} tone="danger" /></Link>
      </div>
      <p className="mt-3 text-sm text-muted">{engagement.never_started_paid} paid students never started.</p>
    </Card>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Lesson drop-off">
        {insights.lessons?.length ? <ol className="space-y-3">{insights.lessons.map((row) => {
          const rate = row.started ? Math.round(row.finished / row.started * 100) : 0;
          const key = `${row.module}-${row.lesson}`;
          return <li key={key} className={`rounded-xl p-3 ${fixFirst.has(key) ? "border border-warning/40 bg-warning-soft" : "bg-surface-2"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 flex-1 text-sm font-medium">M{row.module} · {row.lesson}</span>{fixFirst.has(key) && <span className="text-xs font-semibold text-warning">Fix first</span>}<span className="text-xs text-muted">{row.started} started · {row.finished} finished</span></div>
            <Progress value={rate} className="mt-2 h-2" /><span className="sr-only">{rate}% finished</span>
          </li>;
        })}</ol> : <Empty title="No lesson data yet" body="Lesson starts and finishes will appear here." />}
      </Card>

      <Card title="Sources that pay">
        {sources.length ? <div className="space-y-2">{sources.map((row) => <div key={row.source} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-xl bg-surface-2 p-3 text-sm"><span className="min-w-0 break-words font-medium">{row.source}</span><span>{row.signups} sign-ups</span><span>{row.paid} paid · {row.signups ? Math.round(row.paid / row.signups * 100) : 0}%</span></div>)}</div> : <Empty title="No source data yet" body="Tagged sign-ups and payments will appear here." />}
      </Card>

      <StatCard label="Refunds" value={insights.refunds.count} hint={`${rupees(insights.refunds.paise)} returned`} tone="danger" />

      <Card title="Schools">
        {insights.schools?.length ? <ul className="space-y-2">{insights.schools.map((row) => <li key={row.school} className="rounded-xl bg-surface-2 p-3"><div className="font-medium">{row.school}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"><span>{row.keys ?? 0} keys</span><span>{row.used ?? 0} used ({row.keys ? Math.round((row.used ?? 0) / row.keys * 100) : 0}%)</span><span>{row.students ?? 0} students</span></div></li>)}</ul> : <Empty title="No school data yet" body="School keys and students will appear here." />}
      </Card>

      <Card title="Workshops">
        {insights.workshops?.length ? <ul className="space-y-3">{insights.workshops.map((row) => <li key={`${row.title}-${row.starts_at}`} className="rounded-xl bg-surface-2 p-3"><div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{row.title}</span><span className="text-xs text-muted">{new Date(row.starts_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</span></div><div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs"><span><b className="block text-sm">{row.registered}/{row.seats}</b>signed up</span><span><b className="block text-sm">{row.attended}</b>attended</span><span><b className="block text-sm">{row.signed_up}</b>made account</span><span><b className="block text-sm">{row.paid}</b>paid</span></div></li>)}</ul> : <Empty title="No workshop data yet" body="Workshop sign-ups and attendance will appear here." />}
      </Card>
    </div>
  </div>;
}

// Supabase returns at most 1,000 rows per request, so read in pages until a short page comes back.
async function fetchAll(query, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}

function moduleCompletion({ chapters, lessons, progress, payingIds }) {
  const byStudent = new Map();
  for (const row of progress) {
    let entry = byStudent.get(row.student_id);
    if (!entry) byStudent.set(row.student_id, entry = { opened: new Set(), done: new Set() });
    entry.opened.add(row.lesson_id);
    if (row.completed_at) entry.done.add(row.lesson_id);
  }
  return chapters.slice().sort((a, b) => a.position - b.position).map((chapter) => {
    const ids = lessons.filter((lesson) => lesson.chapter_id === chapter.id).map((lesson) => lesson.id);
    const base = chapter.is_free
      ? [...byStudent].filter(([, entry]) => ids.some((id) => entry.opened.has(id))).map(([id]) => id)
      : [...payingIds];
    const finished = ids.length ? base.filter((id) => ids.every((lessonId) => byStudent.get(id)?.done.has(lessonId))).length : 0;
    return { label: `M${chapter.position}`, value: base.length ? Math.round(finished / base.length * 100) : 0, base: base.length };
  });
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
