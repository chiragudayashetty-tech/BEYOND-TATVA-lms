import Link from "next/link";
import Shell from "@/components/shell/Shell";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import StudentTable from "../StudentTable";

export const metadata = { title: "Students · Analytics · Beyond Tatva" };
const inactiveDateCutoff = () => new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

export default async function StudentsPage({ searchParams }) {
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params?.days)) ? Number(params.days) : 30;
  const schoolFilter = typeof params?.school === "string" ? params.school : "";
  const schoolId = schoolFilter && schoolFilter !== "none" ? schoolFilter : null;
  const inactiveCutoff = inactiveDateCutoff();
  const supabase = await createClient();
  const [{ data, error }, { data: schools }] = await Promise.all([
    supabase.rpc("admin_student_scores", { p_school_id: schoolId, p_days: days }),
    supabase.rpc("admin_schools"),
  ]);
  const students = (data ?? []).filter((student) => schoolFilter !== "none" || !student.school_id);
  return <Shell roles={["admin"]}>
    <PageTitle title="Student scorecards" subtitle={`Activity and progress for ${days} days. Select a student for their full learning history.`}>
      <div className="flex gap-1 rounded-xl border border-border p-1">{[7, 30, 90].map((range) => <Link key={range} href={`/admin/analytics/students?days=${range}${schoolId ? `&school=${schoolId}` : ""}`} className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm ${days === range ? "bg-primary-soft text-primary" : "text-muted"}`}>{range} days</Link>)}</div>
    </PageTitle>
    <nav className="mb-4 flex flex-wrap gap-2"><Link className="btn-secondary" href={`/admin/analytics?days=${days}`}>Overview</Link><Link className="btn-primary" href={`/admin/analytics/students?days=${days}`}>Students</Link><Link className="btn-secondary" href={`/admin/analytics/schools?days=${days}`}>Schools</Link></nav>
    {error ? <Card><Empty title="Student data unavailable" body="The student scorecards could not be loaded. Please try again." /></Card> : <Card title={`${students.length} students`}>
      <StudentTable students={students} schoolOptions={[...(schools ?? []).map(({ id, name }) => ({ id, name })), { id: "none", name: "No school" }]} initialSchool={schoolFilter} inactiveCutoff={inactiveCutoff} />
    </Card>}
  </Shell>;
}
