import Link from "next/link";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Schools · Analytics · Beyond Tatva" };

export default async function SchoolsPage({ searchParams }) {
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params?.days)) ? Number(params.days) : 30;
  const { data, error } = await (await createClient()).rpc("admin_school_scores", { p_days: days });
  const schools = data ?? [];
  return <Shell roles={["admin"]}>
    <PageTitle title="School analytics" subtitle={`Student activity and conversion for the last ${days} days.`}>
      <div className="flex gap-1 rounded-xl border border-border p-1">{[7, 30, 90].map((range) => <Link key={range} href={`/admin/analytics/schools?days=${range}`} className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm ${days === range ? "bg-primary-soft text-primary" : "text-muted"}`}>{range} days</Link>)}</div>
    </PageTitle>
    <nav className="mb-4 flex flex-wrap gap-2"><Link className="btn-secondary" href={`/admin/analytics?days=${days}`}>Overview</Link><Link className="btn-secondary" href={`/admin/analytics/students?days=${days}`}>Students</Link><Link className="btn-primary" href={`/admin/analytics/schools?days=${days}`}>Schools</Link></nav>
    {error ? <Card><Empty title="School data unavailable" body="The school scorecards could not be loaded. Please try again." /></Card> : <Card title={`${schools.length} schools`}>
      {schools.length === 0 ? <Empty title="No school data yet" body="School activity appears after a student joins a school." /> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-surface-2 text-xs text-muted"><tr>{["School", "Students", "Paid", "Started M0", "Finished M0", "Passed a quiz", "Opened a resource", "Active (30d)", "Avg score"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{schools.map((school) => <tr key={school.school_id ?? "none"} className="hover:bg-surface-2/60"><td className="px-3 py-3 font-semibold"><Link href={`/admin/analytics/students?days=${days}&school=${school.school_id ?? "none"}`} className="text-primary hover:underline">{school.school}</Link></td><td className="px-3 py-3">{school.students}</td><td className="px-3 py-3">{school.paid}</td><td className="px-3 py-3"><span title="The backend currently counts starts in any module, so an M0-only count needs a backend fix.">–</span></td><td className="px-3 py-3">{school.finished_module0}</td><td className="px-3 py-3">{school.passed_a_quiz}</td><td className="px-3 py-3">{school.opened_a_resource}</td><td className="px-3 py-3">{school.active_7d_or_30d}</td><td className="px-3 py-3">{school.avg_score == null ? <span title="No score data available">–</span> : <Badge tone={school.avg_score >= 70 ? "success" : school.avg_score >= 40 ? "warning" : "danger"}>{school.avg_score}</Badge>}</td></tr>)}</tbody></table></div>}
    </Card>}
  </Shell>;
}
