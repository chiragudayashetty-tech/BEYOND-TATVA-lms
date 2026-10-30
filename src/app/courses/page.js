import Link from "next/link";
import { BookOpen } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Empty, PageTitle } from "@/components/ui";
import { CourseCard } from "@/components/course";
import { courses } from "@/lib/catalog";

export const metadata = { title: "My Courses · Beyond Tatva" };

const tabs = [
  { id: "progress", label: "In progress", filter: (c) => c.progress > 0 && c.progress < 100 },
  { id: "all", label: "All courses", filter: () => true },
  { id: "new", label: "Not started", filter: (c) => c.progress === 0 },
  { id: "done", label: "Completed", filter: (c) => c.progress === 100 },
];

export default async function CoursesPage({ searchParams }) {
  const { tab = "all", grade = "all" } = await searchParams;
  const active = tabs.find((t) => t.id === tab) ?? tabs[1];
  const list = courses.filter(active.filter).filter((c) => grade === "all" || c.grade === `Grade ${grade}` || c.grade === "All grades");
  const qs = (p) => `/courses?${new URLSearchParams({ tab, grade, ...p })}`;

  return (
    <Shell roles={["student", "teacher"]}>
      <PageTitle title="My Courses" subtitle={`${courses.length} courses, new ones every month`} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
          {tabs.map((t) => (
            <Link key={t.id} href={qs({ tab: t.id })}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${t.id === active.id ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"}`}>
              {t.label} <span className="ml-1 opacity-70">{courses.filter(t.filter).length}</span>
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {["all", "8", "9", "10"].map((g) => (
            <Link key={g} href={qs({ grade: g })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${g === grade ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-fg"}`}>
              {g === "all" ? "All grades" : `Grade ${g}`}
            </Link>
          ))}
        </div>
      </div>

      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      ) : (
        <Empty icon={BookOpen} title="Nothing here yet" body="Try another tab or grade." action={<Link href="/courses" className="btn-secondary">Show all courses</Link>} />
      )}
    </Shell>
  );
}
