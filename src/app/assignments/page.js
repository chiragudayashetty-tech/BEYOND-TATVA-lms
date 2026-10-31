import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Empty, PageTitle } from "@/components/ui";
import { submissionBadge } from "@/components/activity";
import { getActivities, getCourse } from "@/lib/data";

export const metadata = { title: "Assignments · Beyond Tatva" };

export default async function AssignmentsPage() {
  const [course, { assignments, submissions }] = await Promise.all([getCourse(), getActivities()]);
  const byModule = course.modules.map((m) => ({ m, list: assignments.filter((a) => a.chapter_id === m.id) })).filter((x) => x.list.length);

  return (
    <Shell roles={["student"]}>
      <PageTitle title="Assignments" subtitle="Hand in your work here. You'll see marks and feedback as soon as they're ready." />
      {byModule.length === 0 ? (
        <Empty icon={ClipboardList} title="No assignments yet" body="Assignments appear here when their module opens." />
      ) : (
        <div className="space-y-6">
          {byModule.map(({ m, list }) => (
            <section key={m.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">Module {m.n} · {m.title}</h2>
              <ul className="card divide-y divide-border overflow-hidden">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link href={`/assignments/${a.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2">
                      <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{a.title}</div>
                        {a.due_at && <div className="text-xs text-muted">Due {new Date(a.due_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</div>}
                      </div>
                      {submissionBadge(submissions[a.id], a)}
                      <ChevronRight className="h-4 w-4 text-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
