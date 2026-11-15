import Link from "next/link";
import { ChartLine } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { funnelCounts } from "@/lib/analytics";
import { COURSE_ID } from "@/lib/catalog";
import { BarChart, FunnelCard } from "./AnalyticsCharts";

export const metadata = { title: "Analytics · Studio · Beyond Tatva" };

const money = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const nowIst = () => new Date(Date.now() + 330 * 60_000);
const utcBoundaryForIstDate = (date) => new Date(date.getTime() - 330 * 60_000).toISOString();
const grouped = (rows, keyOf) => {
  const map = new Map();
  for (const row of rows) { const key = keyOf(row); const item = map.get(key) ?? { label: key, count: 0, bought: 0 }; item.count++; if (row.paid) item.bought++; map.set(key, item); }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
};
const labels = (rows) => rows.map((row) => ({ label: row.label, value: row.count }));

export default async function AnalyticsPage({ searchParams }) {
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params?.days)) ? Number(params.days) : 30;
  const schoolId = typeof params?.school === "string" ? params.school : "";
  const today = nowIst();
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1));
  const startAt = utcBoundaryForIstDate(from);
  const endAt = utcBoundaryForIstDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1)));
  const supabase = await createClient();
  const [scoreResult, schoolScoresResult, schoolListResult, profileResult, chapterResult, lessonResult, progressResult, accessResult, quizResult, attemptResult, resourceResult, schoolsResult, purchaseResult] = await Promise.all([
    supabase.rpc("admin_student_scores", { p_school_id: schoolId && schoolId !== "none" ? schoolId : null, p_days: days }),
    supabase.rpc("admin_school_scores", { p_days: days }),
    supabase.rpc("admin_schools"),
    supabase.from("profiles").select("id, grade, school_id, created_at").eq("role", "student").is("duplicate_of", null).gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("chapters").select("id, position, is_free").eq("course_id", COURSE_ID),
    supabase.from("lessons").select("id, chapter_id, position, title").eq("course_id", COURSE_ID),
    fetchAll((a, b) => supabase.from("lesson_progress").select("student_id, lesson_id, completed_at").range(a, b)),
    fetchAll((a, b) => supabase.from("course_access").select("student_id, granted_at").eq("course_id", COURSE_ID).range(a, b)),
    supabase.from("quizzes").select("id, chapter_id, pass_percent").eq("published", true),
    fetchAll((a, b) => supabase.from("quiz_attempts").select("student_id, quiz_id, score, total, passed, created_at").range(a, b)),
    fetchAll((a, b) => supabase.from("resource_views").select("student_id, opens").range(a, b)),
    supabase.from("schools").select("id, name"),
    supabase.from("purchases").select("created_at, amount_paise, status").gte("created_at", startAt).lt("created_at", endAt),
  ]);

  const students = scoreResult.data ?? [];
  const scoreById = new Map(students.map((student) => [student.student_id, student]));
  const schoolNames = new Map((schoolsResult.data ?? []).map((school) => [school.id, school.name]));
  const profiles = (profileResult.data ?? []).filter((profile) => !schoolId || (schoolId === "none" ? !profile.school_id : profile.school_id === schoolId));
  const cohortIds = new Set(profiles.map((profile) => profile.id));
  const chapters = chapterResult.data ?? [];
  const freeChapterIds = new Set(chapters.filter((chapter) => chapter.is_free || chapter.position === 0).map((chapter) => chapter.id));
  const lessons = (lessonResult.data ?? []).filter((lesson) => freeChapterIds.has(lesson.chapter_id));
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const progress = progressResult.data?.data ?? [];
  const accesses = (accessResult.data?.data ?? []).filter((access) => cohortIds.has(access.student_id));
  const quizzes = (quizResult.data ?? []).filter((quiz) => freeChapterIds.has(quiz.chapter_id)).map((quiz) => ({ ...quiz, is_module0: true }));
  const quizIds = new Set(quizzes.map((quiz) => quiz.id));
  const attempts = attemptResult.data?.data ?? [];
  const resources = resourceResult.data?.data ?? [];
  const funnel = funnelCounts({ leads: [], profiles, progress, lessonIds, accesses, quizzes, attempts, resources });

  const schoolRows = grouped(profiles.map((profile) => ({ label: schoolNames.get(profile.school_id) ?? "No school", paid: Boolean(scoreById.get(profile.id)?.paid) })), (row) => row.label);
  const purchased = profiles.filter((profile) => scoreById.get(profile.id)?.paid).length;
  const conversionBars = (rows) => rows.map((row) => ({ label: row.label, value: row.count ? Math.round(row.bought / row.count * 100) : 0 }));

  const lessonDropoff = lessons.slice().sort((a, b) => a.position - b.position).map((lesson, index) => {
    const rows = progress.filter((row) => row.lesson_id === lesson.id && cohortIds.has(row.student_id));
    return { label: `${index + 1}. ${lesson.title}`, value: rows.filter((row) => row.completed_at).length, started: rows.length };
  });


  const totalRevenue = (purchaseResult.data ?? []).filter((row) => row.status !== "revoked").reduce((sum, row) => sum + (row.amount_paise ?? 0), 0);
  const overallError = scoreResult.error || schoolScoresResult.error || profileResult.error || chapterResult.error || lessonResult.error || progressResult.error || accessResult.error || quizResult.error || attemptResult.error || resourceResult.error || schoolsResult.error || purchaseResult.error;

  return <Shell roles={["admin"]}>
    <PageTitle title="Student analytics" subtitle="See who signed up, how far they got, and where students may need help.">
      <div className="flex min-h-11 items-center gap-1 rounded-xl border border-border p-1" aria-label="Date range">{[7, 30, 90].map((range) => <Link key={range} href={`/admin/analytics?days=${range}${schoolId ? `&school=${schoolId}` : ""}`} aria-current={days === range ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${days === range ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2"}`}>{range} days</Link>)}</div>
    </PageTitle>
    <nav className="mb-5 flex flex-wrap gap-2"><Link className="btn-primary" href={`/admin/analytics?days=${days}`}>Overview</Link><Link className="btn-secondary" href={`/admin/analytics/students?days=${days}`}>Students</Link><Link className="btn-secondary" href={`/admin/analytics/schools?days=${days}`}>Schools</Link></nav>
    <form className="mb-5 flex flex-wrap items-end gap-3" action="/admin/analytics"><input type="hidden" name="days" value={days} /><label className="label" htmlFor="school-filter">School</label><select className="input max-w-xs" id="school-filter" name="school" defaultValue={schoolId}><option value="">All schools</option><option value="none">No school</option>{(schoolListResult.data ?? []).map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select><button className="btn-secondary min-h-11" type="submit">Apply filter</button>{schoolId && <Link className="btn-ghost min-h-11" href={`/admin/analytics?days=${days}`}>Clear</Link>}</form>
    {overallError && <p role="alert" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">Some activity data could not load. Numbers that depend on missing data may be incomplete.</p>}
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-3"><StatCard label="Sign-ups" value={profiles.length} hint={`In the last ${days} days`} icon={ChartLine} /><StatCard label="Bought" value={`${purchased}`} hint="Students in this sign-up cohort" /><StatCard label="Revenue recorded" value={money(totalRevenue)} hint={`Purchases in the last ${days} days`} /></div>
    <div className="grid gap-5 xl:grid-cols-2"><FunnelCard stages={funnel} />
      <BarChart title="Lesson drop-off · completed" data={lessonDropoff} format={(value) => `${value}`} />
      <BarChart title="Sign-ups by school" data={labels(schoolRows)} />
      <BarChart title="Bought by school · conversion %" data={conversionBars(schoolRows)} format={(value) => `${value}%`} colors={["bg-success", "bg-primary", "bg-warning"]} />
    </div>
    <section className="mt-8"><Card title="Schools at a glance" action={<Link href={`/admin/analytics/schools?days=${days}`} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">Open school analytics</Link>}>
      {(schoolScoresResult.data ?? []).length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-surface-2 text-xs text-muted"><tr><th className="px-3 py-3">School</th><th className="px-3 py-3">Students</th><th className="px-3 py-3">Paid</th><th className="px-3 py-3">Finished M0</th><th className="px-3 py-3">Avg score</th></tr></thead><tbody className="divide-y divide-border">{(schoolScoresResult.data ?? []).slice(0, 8).map((school) => <tr key={school.school_id ?? "none"}><td className="px-3 py-3">{school.school}</td><td className="px-3 py-3">{school.students}</td><td className="px-3 py-3">{school.paid}</td><td className="px-3 py-3">{school.finished_module0}</td><td className="px-3 py-3">{school.avg_score == null ? <span title="Not enough student activity to calculate">–</span> : <Badge tone={school.avg_score >= 70 ? "success" : school.avg_score >= 40 ? "warning" : "danger"}>{school.avg_score}</Badge>}</td></tr>)}</tbody></table></div> : <Empty title="No school data yet" body="School comparisons will appear here." />}
    </Card></section>
  </Shell>;
}

function leadLabel(source) {
  if (source === "Unknown") return source;
  if (["website", "loki", "module0", "qr", "web"].includes(source)) return `Website · ${source}`;
  if (source === "workshop") return "Workshop form (old)";
  if (["manual", "import"].includes(source)) return `Admin-entered · ${source}`;
  if (["outreach", "outreach_studio"].includes(source)) return "Outreach studio";
  return source;
}

async function fetchAll(query, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}
