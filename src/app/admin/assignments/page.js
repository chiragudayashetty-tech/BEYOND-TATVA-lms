import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import MoreNotice from "../MoreNotice";
import AssignmentStudio from "./AssignmentStudio";

export const metadata = { title: "Assignments · Studio · Beyond Tatva" };

export default async function AssignmentsPage({ searchParams }) {
  const show = Math.min(Math.max(Number((await searchParams)?.show) || 300, 300), 5000);
  const [course, supabase] = await Promise.all([getCourse(), createClient()]);
  const [{ data: assignments }, { data: subs }, { data: students }] = await Promise.all([
    supabase.from("assignments").select("*").order("position").order("created_at"),
    supabase.from("assignment_submissions").select("*").order("updated_at", { ascending: false }).limit(show + 1),
    supabase.from("profiles").select("id, full_name, grade").eq("role", "student"),
  ]);
  const more = (subs ?? []).length > show;
  if (more) subs.length = show;
  // Photos/PDFs live in a private bucket; Studio gets short-lived links to open them.
  const paths = [...new Set((subs ?? []).flatMap((s) => s.files))];
  const links = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("submissions").createSignedUrls(paths, 60 * 60);
    for (const d of data ?? []) if (d.signedUrl) links[d.path] = d.signedUrl;
  }
  const name = Object.fromEntries((students ?? []).map((s) => [s.id, `${s.full_name}${s.grade ? ` · Grade ${s.grade}` : ""}`]));
  const submissions = (subs ?? []).map((s) => ({ ...s, student: name[s.student_id] ?? "Student", fileLinks: s.files.map((p) => ({ path: p, url: links[p] ?? null })) }));

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Assignments" subtitle="Set work for each module, then mark what students hand in. Students see marks and feedback straight away." />
      {more && <MoreNotice shown={show} href={`/admin/assignments?show=${show * 2}`} what="hand-ins" />}
      <AssignmentStudio modules={course.modules.map((m) => ({ id: m.id, n: m.n, title: m.title }))} assignments={assignments ?? []} submissions={submissions} />
    </Shell>
  );
}
