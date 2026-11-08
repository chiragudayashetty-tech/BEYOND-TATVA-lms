import Link from "next/link";
import { ChartLine } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { funnelCounts, medianDaysBetween, revenueByIstWeek } from "@/lib/analytics";
import { COURSE_ID } from "@/lib/catalog";
import { BarChart, FunnelCard } from "./AnalyticsCharts";
import LeadMatching from "./LeadMatching";

export const metadata = { title: "Analytics · Studio · Beyond Tatva" };

const safePct = (a, b) => b ? Math.round(a / b * 100) : null;
const money = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const nowIst = () => new Date(Date.now() + 330 * 60_000);
const utcBoundaryForIstDate = (date) => new Date(date.getTime() - 330 * 60_000).toISOString();
const grouped = (rows, keyOf) => {
  const map = new Map();
  for (const row of rows) { const key = keyOf(row); const item = map.get(key) ?? { label: key, count: 0, bought: 0 }; item.count++; if (row.paid) item.bought++; map.set(key, item); }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
};
const labels = (rows) => rows.map((row) => ({ label: row.label, value: row.count }));
const fmtDays = (value) => value == null ? "–" : `${value} days`;

export default async function AnalyticsPage({ searchParams }) {
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params?.days)) ? Number(params.days) : 30;
  const schoolId = typeof params?.school === "string" ? params.school : "";
  const today = nowIst();
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1));
  const startAt = utcBoundaryForIstDate(from);
  const endAt = utcBoundaryForIstDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1)));
  const supabase = await createClient();
  const [scoreResult, schoolScoresResult, schoolListResult, profileResult, chapterResult, lessonResult, progressResult, accessResult, quizResult, attemptResult, resourceResult, leadResult, allLeadLinksResult, registrationResult, workshopResult, schoolsResult, purchaseResult] = await Promise.all([
    supabase.rpc("admin_student_scores", { p_school_id: schoolId && schoolId !== "none" ? schoolId : null, p_days: days }),
    supabase.rpc("admin_school_scores", { p_days: days }),
    supabase.rpc("admin_schools"),
    supabase.from("profiles").select("id, grade, school_id, created_at").eq("role", "student").gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("chapters").select("id, position, is_free").eq("course_id", COURSE_ID),
    supabase.from("lessons").select("id, chapter_id, position, title").eq("course_id", COURSE_ID),
    fetchAll((a, b) => supabase.from("lesson_progress").select("student_id, lesson_id, completed_at").range(a, b)),
    fetchAll((a, b) => supabase.from("course_access").select("student_id, granted_at").eq("course_id", COURSE_ID).range(a, b)),
    supabase.from("quizzes").select("id, chapter_id, pass_percent").eq("published", true),
    fetchAll((a, b) => supabase.from("quiz_attempts").select("student_id, quiz_id, score, total, passed, created_at").range(a, b)),
    fetchAll((a, b) => supabase.from("resource_views").select("student_id, opens").range(a, b)),
    supabase.from("leads").select("id, student_id, source, created_at").eq("course_id", COURSE_ID).gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("leads").select("id, student_id").eq("course_id", COURSE_ID),
    supabase.from("workshop_registrations").select("id, student_name, parent_phone, lead_id, workshop_id, attended_at, created_at").gte("created_at", startAt).lt("created_at", endAt),
    supabase.from("workshops").select("id, title, school_id"),
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

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const gradeRows = grouped(profiles.map((profile) => ({ label: profile.grade ? `Grade ${profile.grade}` : "Unknown", paid: Boolean(scoreById.get(profile.id)?.paid) })), (row) => row.label);
  const schoolRows = grouped(profiles.map((profile) => ({ label: schoolNames.get(profile.school_id) ?? "No school", paid: Boolean(scoreById.get(profile.id)?.paid) })), (row) => row.label);
  const purchased = profiles.filter((profile) => scoreById.get(profile.id)?.paid).length;
  const conversionBars = (rows) => rows.map((row) => ({ label: row.label, value: row.count ? Math.round(row.bought / row.count * 100) : 0 }));
  const revenue = revenueByIstWeek(purchaseResult.data ?? []).slice(-10).map(({ week, amountPaise }) => ({ label: week, value: amountPaise }));
  const timeToBuy = medianDaysBetween(profiles.map((profile) => ({ signed_up_at: profile.created_at, paid_at: scoreById.get(profile.id)?.paid_at })));

  const m0QuizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const cohortAttempts = attempts.filter((attempt) => cohortIds.has(attempt.student_id) && quizIds.has(attempt.quiz_id)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const m0StartedIds = new Set(progress.filter((row) => lessonIds.has(row.lesson_id)).map((row) => row.student_id));
  const m0PassedIds = new Set(attempts.filter((attempt) => quizIds.has(attempt.quiz_id)).filter((attempt) => {
    const minimum = m0QuizById.get(attempt.quiz_id)?.pass_percent ?? 0;
    return (attempt.total > 0 ? attempt.score / attempt.total * 100 : 0) >= minimum;
  }).map((attempt) => attempt.student_id));
  const scorePct = (attempt) => attempt.total > 0 ? attempt.score / attempt.total * 100 : null;
  const validAttemptScores = cohortAttempts.map(scorePct).filter(Number.isFinite);
  const averageQuiz = validAttemptScores.length ? Math.round(validAttemptScores.reduce((sum, value) => sum + value, 0) / validAttemptScores.length) : null;
  const firstAttemptByStudent = new Map();
  for (const attempt of cohortAttempts) if (!firstAttemptByStudent.has(attempt.student_id)) firstAttemptByStudent.set(attempt.student_id, attempt);
  const firstPassRows = [...firstAttemptByStudent.values()];
  const firstPassCount = firstPassRows.filter((attempt) => {
    const minimum = m0QuizById.get(attempt.quiz_id)?.pass_percent ?? 0;
    return (scorePct(attempt) ?? 0) >= minimum;
  }).length;
  const firstPassRate = firstPassRows.length ? Math.round(firstPassCount / firstPassRows.length * 100) : null;
  const lessonDropoff = lessons.slice().sort((a, b) => a.position - b.position).map((lesson, index) => {
    const rows = progress.filter((row) => row.lesson_id === lesson.id && cohortIds.has(row.student_id));
    return { label: `${index + 1}. ${lesson.title}`, value: rows.filter((row) => row.completed_at).length, started: rows.length };
  });

  const linkedLeads = (leadResult.data ?? []).filter((lead) => !schoolId || profileById.has(lead.student_id));
  const leadGroups = new Map();
  for (const lead of linkedLeads) {
    const key = lead.source ? String(lead.source) : "Unknown";
    const group = leadGroups.get(key) ?? { label: leadLabel(key), leads: 0, ids: new Set() };
    group.leads++;
    if (lead.student_id) group.ids.add(lead.student_id);
    leadGroups.set(key, group);
  }
  const sourceRows = [...leadGroups.values()].sort((a, b) => a.label.localeCompare(b.label)).map((group) => {
    const linked = [...group.ids].map((id) => scoreById.get(id)).filter(Boolean);
    const signedUp = group.ids.size;
    const started = [...group.ids].filter((id) => m0StartedIds.has(id)).length;
    const finished = linked.filter((student) => student.module0_lessons > 0 && student.module0_completed >= student.module0_lessons).length;
    const passed = [...group.ids].filter((id) => m0PassedIds.has(id)).length;
    const bought = linked.filter((student) => student.paid).length;
    return { label: group.label, leads: group.leads, signedUp, started, finished, passed, bought, conversion: safePct(bought, group.leads) };
  });

  const leadById = new Map((allLeadLinksResult.data ?? []).map((lead) => [lead.id, lead]));
  const workshopsById = new Map((workshopResult.data ?? []).map((workshop) => [workshop.id, workshop]));
  const followups = (registrationResult.data ?? []).filter((registration) => {
    const lead = leadById.get(registration.lead_id);
    const workshop = workshopsById.get(registration.workshop_id);
    const schoolMatches = !schoolId || (schoolId === "none" ? !workshop?.school_id : workshop?.school_id === schoolId);
    return Boolean(registration.attended_at) && schoolMatches && !lead?.student_id;
  }).map((registration) => {
    const workshop = workshopsById.get(registration.workshop_id);
    return { id: registration.id, student_name: registration.student_name, parent_phone: registration.parent_phone, school: schoolNames.get(workshop?.school_id) ?? "–", workshop: workshop?.title ?? "Workshop" };
  });
  const linkedStudentIds = new Set((allLeadLinksResult.data ?? []).map((lead) => lead.student_id).filter(Boolean));
  const direct = profiles.map((profile) => scoreById.get(profile.id)).filter((student) => student && !linkedStudentIds.has(student.student_id)).map((student) => ({ ...student, lessons_started: m0StartedIds.has(student.student_id) ? 1 : 0 }));

  const totalRevenue = (purchaseResult.data ?? []).filter((row) => row.status !== "revoked").reduce((sum, row) => sum + (row.amount_paise ?? 0), 0);
  const overallError = scoreResult.error || schoolScoresResult.error || profileResult.error || chapterResult.error || lessonResult.error || progressResult.error || accessResult.error || quizResult.error || attemptResult.error || resourceResult.error || leadResult.error || allLeadLinksResult.error || registrationResult.error || workshopResult.error || schoolsResult.error || purchaseResult.error;

  return <Shell roles={["admin"]}>
    <PageTitle title="Student analytics" subtitle="See who signed up, how far they got, and where students may need help.">
      <div className="flex min-h-11 items-center gap-1 rounded-xl border border-border p-1" aria-label="Date range">{[7, 30, 90].map((range) => <Link key={range} href={`/admin/analytics?days=${range}${schoolId ? `&school=${schoolId}` : ""}`} aria-current={days === range ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium ${days === range ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2"}`}>{range} days</Link>)}</div>
    </PageTitle>
    <nav className="mb-5 flex flex-wrap gap-2"><Link className="btn-primary" href={`/admin/analytics?days=${days}`}>Overview</Link><Link className="btn-secondary" href={`/admin/analytics/students?days=${days}`}>Students</Link><Link className="btn-secondary" href={`/admin/analytics/schools?days=${days}`}>Schools</Link></nav>
    <form className="mb-5 flex flex-wrap items-end gap-3" action="/admin/analytics"><input type="hidden" name="days" value={days} /><label className="label" htmlFor="school-filter">School</label><select className="input max-w-xs" id="school-filter" name="school" defaultValue={schoolId}><option value="">All schools</option><option value="none">No school</option>{(schoolListResult.data ?? []).map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select><button className="btn-secondary min-h-11" type="submit">Apply filter</button>{schoolId && <Link className="btn-ghost min-h-11" href={`/admin/analytics?days=${days}`}>Clear</Link>}</form>
    {overallError && <p role="alert" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">Some activity data could not load. Numbers that depend on missing data may be incomplete.</p>}
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Sign-ups" value={profiles.length} hint={`In the last ${days} days`} icon={ChartLine} /><StatCard label="Bought" value={`${purchased}`} hint="Students in this sign-up cohort" /><StatCard label="Revenue recorded" value={money(totalRevenue)} hint={`Purchases in the last ${days} days`} /><StatCard label="Sign-up to purchase" value={fmtDays(timeToBuy)} hint={timeToBuy == null ? "No cohort purchases with both dates" : "Median time"} /></div>
    <div className="grid gap-5 xl:grid-cols-2"><FunnelCard stages={funnel} />
      <Card title="Module 0 quiz health"><div className="grid grid-cols-2 gap-3"><StatCard label="Average attempt score" value={averageQuiz == null ? <span title="No Module 0 quiz attempts in this sign-up cohort">–</span> : `${averageQuiz}%`} hint={`${cohortAttempts.length} attempts`} /><StatCard label="Passed first try" value={firstPassRate == null ? <span title="No students have attempted a Module 0 quiz">–</span> : `${firstPassRate}%`} hint={`${firstPassCount} of ${firstPassRows.length} students`} /></div></Card>
      <BarChart title="Lesson drop-off · completed" data={lessonDropoff} format={(value) => `${value}`} />
      <BarChart title="Sign-ups by grade" data={labels(gradeRows)} />
      <BarChart title="Bought by grade · conversion %" data={conversionBars(gradeRows)} format={(value) => `${value}%`} colors={["bg-success", "bg-primary", "bg-warning"]} />
      <BarChart title="Sign-ups by school" data={labels(schoolRows)} />
      <BarChart title="Bought by school · conversion %" data={conversionBars(schoolRows)} format={(value) => `${value}%`} colors={["bg-success", "bg-primary", "bg-warning"]} />
      <BarChart title="Revenue by IST week" data={revenue} format={(value) => money(value)} colors={["bg-success", "bg-primary", "bg-warning"]} />
    </div>
    <section className="mt-8"><h2 className="mb-4 text-xl font-semibold">Lead matching</h2><LeadMatching sources={sourceRows} followups={followups} direct={direct} /></section>
    <section className="mt-8"><Card title="Schools at a glance" action={<Link href={`/admin/analytics/schools?days=${days}`} className="text-sm font-medium text-primary hover:underline">Open school analytics</Link>}>
      {(schoolScoresResult.data ?? []).length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-surface-2 text-xs text-muted"><tr><th className="px-3 py-3">School</th><th className="px-3 py-3">Students</th><th className="px-3 py-3">Paid</th><th className="px-3 py-3">Finished M0</th><th className="px-3 py-3">Avg score</th></tr></thead><tbody className="divide-y divide-border">{(schoolScoresResult.data ?? []).slice(0, 8).map((school) => <tr key={school.school_id ?? "none"}><td className="px-3 py-3">{school.school}</td><td className="px-3 py-3">{school.students}</td><td className="px-3 py-3">{school.paid}</td><td className="px-3 py-3">{school.finished_module0}</td><td className="px-3 py-3">{school.avg_score == null ? <span title="Not enough student activity to calculate">–</span> : <Badge tone={school.avg_score >= 70 ? "success" : school.avg_score >= 40 ? "warning" : "danger"}>{school.avg_score}</Badge>}</td></tr>)}</tbody></table></div> : <Empty title="No school data yet" body="School comparisons will appear here." />}
    </Card></section>
  </Shell>;
}

function leadLabel(source) {
  if (source === "Unknown") return source;
  if (["website", "loki", "module0", "qr", "web"].includes(source)) return `Website · ${source}`;
  if (source === "workshop") return "Workshop form";
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
