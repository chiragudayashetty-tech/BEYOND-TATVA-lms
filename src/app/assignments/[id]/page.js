import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { getActivities, getCourse } from "@/lib/data";
import { createClient, getSession } from "@/lib/supabase/server";
import HandIn from "./HandIn";

export const metadata = { title: "Assignment · Beyond Tatva" };

export default async function AssignmentPage({ params }) {
  const { id } = await params;
  const [{ user }, course, { assignments, submissions }] = await Promise.all([getSession(), getCourse(), getActivities()]);
  const a = assignments.find((x) => x.id === id);
  if (!a) notFound();
  const sub = submissions[id] ?? null;
  const mod = course.modules.find((m) => m.id === a.chapter_id);
  let files = [];
  if (sub?.files?.length) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("submissions").createSignedUrls(sub.files, 3600);
    files = (data ?? []).map((d) => ({ path: d.path, url: d.signedUrl }));
  }
  return (
    <Shell roles={["student"]}>
      <Link href="/assignments" className="btn-ghost -ml-3 mb-3"><ArrowLeft className="h-4 w-4" /> Assignments</Link>
      <HandIn assignment={a} moduleLabel={mod ? `Module ${mod.n} · ${mod.title}` : ""} submission={sub} files={files} userId={user.id} />
    </Shell>
  );
}
