import Link from "next/link";
import { ChartLine } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { funnelCounts, moduleWatch, needsNudge } from "@/lib/analytics";
import PersonLink from "../PersonLink";
import { COURSE_ID } from "@/lib/catalog";
import { FunnelCard } from "./AnalyticsCharts";

export const metadata = { title: "Analytics · Studio · Beyond Tatva" };

const money = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const nowIst = () => new Date(Date.now() + 330 * 60_000);
const utcBoundaryForIstDate = (date) => new Date(date.getTime() - 330 * 60_000).toISOString();

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
    supabase.from("lessons").select("id, chapter_id, position, title, minutes").eq("course_id", COURSE_ID),
    fetchAll((a, b) => supabase.from("lesson_progress").select("student_id, lesson_id, completed_at, updated_at, seen, watched_pct, video_seconds").range(a, b)),
    fetchAll((a, b) => supabase.from("course_access").select("student_id, granted_at").eq("course_id", COURSE_ID).range(a, b)),
    supabase.from("quizzes").select("id, chapter_id, pass_percent").eq("published", true),
    fetchAll((a, b) => supabase.from("quiz_attempts").select("student_id, quiz_id, score, total, passed, created_at").range(a, b)),
    fetchAll((a, b) => supabase.from("resource_views").select("student_id, opens").range(a, b)),
    supabase.from("schools").select("id, name"),
    supabase.from("purchases").select("created_at, amount_paise, status").gte("created_at", startAt).lt("created_at", endAt),
  ]);

  const students = scoreResult.data ?? [];
  const scoreById = new Map(students.map((student) => [student.student_id, student]));
  const profiles = (profileResult.data ?? []).filter((profile) => !schoolId || (schoolId === "none" ? !profile.school_id : profile.school_id === schoolId));
  const cohortIds = new Set(profiles.map((profile) => profile.id));
  const chapters = chapterResult.data ?? [];
  const freeChapterIds = new Set(chapters.filter((chapter) => chapter.is_free || chapter.position === 0).map((chapter) => chapter.id));
  const lessons = (lessonResult.data ?? []).filter((lesson) => freeChapterIds.has(lesson.chapter_id));
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const progress = progressResult.data ?? [];
  const accesses = (accessResult.data ?? []).filter((access) => cohortIds.has(access.student_id));
  const quizzes = (quizResult.data ?? []).filter((quiz) => freeChapterIds.has(quiz.chapter_id)).map((quiz) => ({ ...quiz, is_module0: true }));
  const quizIds = new Set(quizzes.map((quiz) => quiz.id));
  const attempts = attemptResult.data ?? [];
  const resources = resourceResult.data ?? [];
  const funnel = funnelCounts({ leads: [], profiles, progress, lessonIds, accesses, quizzes, attempts, resources });

  const purchased = profiles.filter((profile) => scoreById.get(profile.id)?.paid).length;

  const chapterPos = new Map(chapters.map((chapter) => [chapter.id, chapter.position]));
  const allLessons = (lessonResult.data ?? []).slice().sort((a, b) => (chapterPos.get(a.chapter_id) ?? 0) - (chapterPos.get(b.chapter_id) ?? 0) || a.position - b.position);
  const studentIds = new Set(students.map((student) => student.student_id));
  const modules = moduleWatch(allLessons, progress.filter((row) => studentIds.has(row.student_id)));
  const nudge = needsNudge(students, progress, allLessons.length);
  const pctByStudent = new Map();
  for (const row of progress) pctByStudent.set(`${row.student_id}:${row.lesson_id}`, row.completed_at ? 100 : row.watched_pct ?? 0);



  const totalRevenue = (purchaseResult.data ?? []).filter((row) => row.status !== "revoked").reduce((sum, row) => sum + (row.amount_paise ?? 0), 0);
  const overallError = scoreResult.error || schoolScoresResult.error || profileResult.error || chapterResult.error || lessonResult.error || progressResult.error || accessResult.error || quizResult.error || attemptResult.error || resourceResult.error || schoolsResult.error || purchaseResult.error;

  return <Shell roles={["admin"]}>
    <PageTitle title="Student analytics" subtitle="See who signed up, how far they got, and where students may need help.">
      <div className="flex min-h-11 items-center gap-1 rounded-xl border border-border p-1" aria-label="Date range">{[7, 30, 90].map((range) => <Link key={range} href={`/admin/analytics?days=${range}${schoolId ? `&school=${schoolId}` : ""}`} aria-current={days === range ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${days === range ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2"}`}>{range} days</Link>)}</div>
    </PageTitle>
    <nav className="mb-5 flex flex-wrap gap-2"><Link className="btn-primary" href={`/admin/analytics?days=${days}`}>Overview</Link><Link className="btn-secondary" href={`/admin/analytics/students?days=${days}`}>Students</Link><Link className="btn-secondary" href={`/admin/analytics/schools?days=${days}`}>Schools</Link><Link className="btn-secondary" href="/admin/analytics/live">Live tracking</Link></nav>
    <form className="mb-5 flex flex-wrap items-end gap-3" action="/admin/analytics"><input type="hidden" name="days" value={days} /><label className="label" htmlFor="school-filter">School</label><select className="input max-w-xs" id="school-filter" name="school" defaultValue={schoolId}><option value="">All schools</option><option value="none">No school</option>{(schoolListResult.data ?? []).map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select><button className="btn-secondary min-h-11" type="submit">Apply filter</button>{schoolId && <Link className="btn-ghost min-h-11" href={`/admin/analytics?days=${days}`}>Clear</Link>}</form>
    {overallError && <p role="alert" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">Some activity data could not load. Numbers that depend on missing data may be incomplete.</p>}
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-3"><StatCard label="Sign-ups" value={profiles.length} hint={`In the last ${days} days`} icon={ChartLine} /><StatCard label="Bought" value={`${purchased}`} hint="Students in this sign-up cohort" /><StatCard label="Revenue recorded" value={money(totalRevenue)} hint={`Purchases in the last ${days} days`} /></div>
    <div className="grid gap-5 xl:grid-cols-2"><FunnelCard stages={funnel} />
      <Card title="Module watching" action={<span className="text-xs text-muted">Parts really played, skips don&apos;t count</span>}>
        {modules.length ? <div className="space-y-5">{modules.map((m) => <div key={m.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-medium">{m.title}</span>
            <span className="text-muted">{m.started} started · {m.avgPct == null ? "–" : `${m.avgPct}% watched on average`} · {m.completed} finished</span></div>
          <div className="mt-2 flex h-16 items-end gap-1" role="img" aria-label={`${m.title}: share of starters still watching at each tenth of the video: ${m.curve.join("%, ")}%`}>
            {m.curve.map((v, i) => <div key={i} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(v, 2)}%` }} title={`${i * 10}–${i * 10 + 10}% of the video: ${v}% of starters`} />)}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-subtle"><span>Start</span><span>Bars = % of starters who watched each tenth</span><span>End</span></div>
        </div>)}</div> : <Empty title="No modules yet" body="Add lessons in Content." />}
      </Card>
    </div>
    <Card title={`Needs a nudge (${nudge.length})`} className="mt-5" action={<span className="text-xs text-muted">No learning for 7+ days</span>} pad={false}>
      {nudge.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-surface-2 text-xs text-muted"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">School</th>{allLessons.map((l) => <th key={l.id} className="px-4 py-3">{l.title}</th>)}<th className="px-4 py-3">Last learned</th><th className="px-4 py-3">Why</th></tr></thead>
        <tbody className="divide-y divide-border">{nudge.slice(0, 50).map((n) => <tr key={n.student_id}><td className="px-4 py-3"><PersonLink studentId={n.student_id} className="font-medium">{n.full_name || "Student"}</PersonLink>{n.paid && <Badge tone="success">Paid</Badge>}</td><td className="px-4 py-3 text-muted">{n.school ?? "–"}</td>
          {allLessons.map((l) => <td key={l.id} className="px-4 py-3 tabular-nums">{pctByStudent.has(`${n.student_id}:${l.id}`) ? `${pctByStudent.get(`${n.student_id}:${l.id}`)}%` : "–"}</td>)}
          <td className="px-4 py-3 text-muted">{n.last ? new Date(n.last).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "Never"}</td><td className="px-4 py-3"><Badge tone={n.reason === "Never started" ? "warning" : "danger"}>{n.reason}</Badge></td></tr>)}</tbody></table></div>
        : <div className="p-5"><Empty title="Nobody needs a nudge" body="Every student has learned in the last 7 days or finished the course." /></div>}
    </Card>
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
