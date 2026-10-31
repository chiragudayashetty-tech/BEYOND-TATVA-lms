import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clapperboard, ClipboardCheck, Contact, Film, GraduationCap, KeyRound, ListChecks, School, UserCheck, Users, Workflow } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, IconTile, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { fmtPremiere, isReleased, nextPremiere } from "@/lib/catalog";
import { getCourse } from "@/lib/data";
import { createClient, isPreview } from "@/lib/supabase/server";

export const metadata = { title: "Studio · Beyond Tatva" };

const sections = [
  { href: "/admin/content", icon: Clapperboard, title: "Content", body: "Course, modules, lessons, videos and premiere dates" },
  { href: "/admin/quizzes", icon: ListChecks, title: "Quizzes", body: "One quiz per module: questions, pass mark, XP" },
  { href: "/admin/assignments", icon: ClipboardCheck, title: "Assignments", body: "Set work per module and mark what students hand in" },
  { href: "/admin/enrollments", icon: UserCheck, title: "Enrollments", body: "Website payments, manual enrollments and refunds" },
  { href: "/admin/access", icon: KeyRound, title: "Access keys", body: "Create keys for schools and see who redeemed them" },
  { href: "/admin/people", icon: School, title: "Schools and people", body: "Schools, join codes, classes, teachers and students" },
  { href: "/admin/crm", icon: Contact, title: "CRM", body: "Leads, schools in the pipeline, follow-ups" },
  { href: "/admin/automations", icon: Workflow, title: "Automations", body: "Reminders, emails, WhatsApp and Sheets sync" },
];

export default async function AdminPage() {
  const [course, supabase] = await Promise.all([getCourse(), createClient()]);
  const [{ data: s }, { count: withVideo }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.from("lesson_media").select("lesson_id", { count: "exact", head: true }),
  ]);
  const stats = s ?? {};
  const next = nextPremiere(course);

  return (
    <Shell roles={["admin"]} greeting>
      {isPreview && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" /> Local preview: numbers show as 0 and changes won&apos;t save. Sign in with your Studio account to manage real data.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Students" value={stats.students ?? 0} hint={`${stats.parents ?? 0} parents · ${stats.teachers ?? 0} teachers`} icon={Users} />
        <StatCard label="Full access" value={stats.unlocked ?? 0} hint={`${stats.enrollments_claimed ?? 0} paid · ${stats.keys_used ?? 0} keys`} icon={KeyRound} tone="success" />
        <StatCard label="Lessons completed" value={stats.lessons_completed ?? 0} hint="All students, all time" icon={CheckCircle2} tone="warning" />
        <StatCard label="To mark" value={stats.to_review ?? 0} hint={`${stats.enrollments_pending ?? 0} paid, not signed in yet`} icon={ClipboardCheck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Release schedule" action={<Link href="/admin/content" className="text-sm font-medium text-primary hover:underline">Edit</Link>}>
          <ul className="divide-y divide-border">
            {course.modules.map((m) => {
              const out = isReleased(m);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <IconTile icon={iconFor(m)} tone={out ? "primary" : "neutral"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">Module {m.n}: {m.title}</div>
                    <div className="text-xs text-muted">{m.lessons.length} lessons · {fmtPremiere(m.release)}</div>
                  </div>
                  {m.free && <Badge tone="success">Free</Badge>}
                  <Badge tone={out ? "success" : "primary"}>{out ? "Live" : "Scheduled"}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          {next && (
            <div className="card flex items-center gap-4 p-5">
              <IconTile icon={CalendarClock} />
              <div>
                <div className="text-sm text-muted">Next premiere</div>
                <div className="font-semibold">Module {next.n}: {next.title}</div>
                <div className="text-sm text-muted">{fmtPremiere(next.release)}</div>
              </div>
            </div>
          )}
          <div className="card flex items-center gap-4 p-5">
            <IconTile icon={Film} tone="warning" />
            <div>
              <div className="text-sm text-muted">Lessons with a video</div>
              <div className="font-semibold">{isPreview ? "Sign in to see" : `${withVideo ?? 0} of ${course.lessonCount}`}</div>
            </div>
          </div>
          <ul className="card divide-y divide-border overflow-hidden">
            {sections.map((x) => (
              <li key={x.href}>
                <Link href={x.href} className="flex items-center gap-3 p-4 transition hover:bg-surface-2">
                  <IconTile icon={x.icon} size="sm" tone="neutral" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{x.title}</div>
                    <div className="truncate text-xs text-muted">{x.body}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}
