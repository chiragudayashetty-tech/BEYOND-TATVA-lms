import Link from "next/link";
import { CalendarClock, CircleCheck, ClipboardList, MessageSquareText, Sparkles, Upload } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Empty, IconTile, PageTitle, Progress } from "@/components/ui";
import { iconFor } from "@/components/course";
import { getModule } from "@/lib/catalog";
import { assignments } from "@/lib/demo";

export const metadata = { title: "Assignments · Beyond Tatva" };

const tabs = [
  { id: "pending", label: "Pending" },
  { id: "submitted", label: "Submitted" },
  { id: "graded", label: "Graded" },
];
const prio = { High: "danger", Medium: "warning", Low: "neutral" };

export default async function AssignmentsPage({ searchParams }) {
  const { tab = "pending" } = await searchParams;
  const list = assignments.filter((a) => a.status === tab);

  return (
    <Shell roles={["student"]}>
      <PageTitle title="Assignments" subtitle="Submit your work and get instant AI feedback, then your teacher's review." />

      <div className="mb-6 inline-flex gap-1 rounded-xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <Link key={t.id} href={`/assignments?tab=${t.id}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${t.id === tab ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"}`}>
            {t.label} <span className="ml-1 opacity-70">{assignments.filter((a) => a.status === t.id).length}</span>
          </Link>
        ))}
      </div>

      {!list.length ? (
        <Empty icon={ClipboardList} title="All clear" body="Nothing in this list right now." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((a) => {
            const course = getModule(a.module);
            return (
              <article key={a.id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <IconTile icon={iconFor(course)} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug">{a.title}</h3>
                    <div className="mt-0.5 text-sm text-muted">Module {course.n}: {course.title}</div>
                  </div>
                  {a.status === "pending" && <Badge tone={prio[a.priority]}>{a.priority}</Badge>}
                  {a.status === "graded" && <Badge tone="success">{a.score}</Badge>}
                  {a.status === "submitted" && <Badge tone="primary">In review</Badge>}
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <CalendarClock className="h-4 w-4" /> {a.status === "pending" ? `Due ${a.due}` : `Submitted ${a.due}`}
                </div>

                {a.status === "pending" && (
                  <>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                      <Progress value={a.progress} className="h-1.5" /> <span className="shrink-0 font-medium text-fg">{a.progress}%</span>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button className="btn-primary flex-1"><Upload className="h-4 w-4" /> Submit work</button>
                      <button className="btn-secondary"><Sparkles className="h-4 w-4" /> Get AI hints</button>
                    </div>
                  </>
                )}

                {a.status === "graded" && (
                  <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-1.5 font-medium"><MessageSquareText className="h-4 w-4 text-primary" /> Feedback</div>
                    <p className="text-muted">{a.feedback}</p>
                  </div>
                )}

                {a.status === "submitted" && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm text-success">
                    <CircleCheck className="h-4 w-4" /> AI feedback ready. Teacher review in 1–2 days.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
