import Link from "next/link";
import { Award, CalendarClock, CircleCheck, ClipboardList, Download, FolderKanban, Gift, KeyRound, PlayCircle, Sparkles } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { IconTile, Ring } from "@/components/ui";
import { ModuleCard, NextStepCard } from "@/components/course";
import { isReleased, nextStep } from "@/lib/catalog";
import { getActivities, getCourse } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Course · Beyond Tatva" };

const COURSE_BANNER = "/media/course-banner.jpg";

// Compact course page: header, next step, what you get, then every module as a same-size card.
// Tapping a module opens /course/<n> with its lessons, quiz, assignment and files.
export default async function CoursePage({ searchParams }) {
  const { welcome } = await searchParams;
  const [{ hasAccess }, course, activities] = await Promise.all([getSession(), getCourse(), getActivities()]);
  const step = nextStep(course, hasAccess, activities);
  const released = course.modules.filter((m) => isReleased(m)).length;
  const done = course.lessons.filter((l) => l.done).length;
  const paid = course.modules.filter((m) => !m.free).length;
  const perks = [
    [PlayCircle, `${course.modules.length} modules`, `${course.lessonCount} short video lessons`],
    [CalendarClock, "Weekly premieres", "A new module every Sunday, 10 AM"],
    [FolderKanban, "Hands-on projects", "Make real things with AI tools"],
    [Sparkles, "Quiz in every module", "2 tries, earn XP"],
    [ClipboardList, "Assignments", "Marked with feedback"],
    [Download, "Watch offline", "Download modules in the app"],
    [Award, "Certificate", "Finish every module (coming soon)"],
  ];

  return (
    <Shell roles={["student", "teacher"]}>
      <div className="space-y-4 lg:space-y-5">
        {welcome && hasAccess && (
          <div role="status" className="card flex items-start gap-3 border-success/40 bg-success-soft p-4">
            <IconTile icon={CircleCheck} tone="success" />
            <div><h2 className="font-semibold">Payment successful. The full course is yours.</h2>
              <p className="mt-0.5 text-sm text-muted">Modules unlock on this account every Sunday at 10 AM. Use this same account on any device.</p></div>
          </div>
        )}

        <section className="card flex items-center gap-4 overflow-hidden p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COURSE_BANNER} alt="" className="hidden h-28 w-44 shrink-0 object-cover sm:block" />
          <div className="min-w-0 flex-1 py-3 pl-4 sm:pl-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{course.grade}</p>
            <h1 className="truncate text-xl font-semibold sm:text-2xl">{course.title}</h1>
            <p className="text-xs text-muted">{released} of {course.modules.length} modules out · {done} of {course.lessonCount} lessons done</p>
          </div>
          <div className="pr-4"><Ring value={course.progress} size={60} stroke={6}><span className="text-sm font-semibold">{course.progress}%</span></Ring></div>
        </section>

        {step.kind !== "unlock" && <NextStepCard step={step} courseId={course.id} />}
        {!hasAccess && (
          <div className="card flex flex-wrap items-center gap-3 border-primary/30 bg-primary-soft/40 p-4">
            <IconTile icon={Gift} tone="success" />
            <div className="min-w-0 flex-1 basis-48">
              <div className="font-semibold">Module 0 is free</div>
              <div className="text-sm text-muted">Unlock the other {paid} modules with a school key<span className="web-only"> or ₹{course.price} one time</span>.</div>
            </div>
            <Link href="/unlock" className="btn-primary w-full sm:w-auto"><KeyRound className="h-4 w-4" /> Unlock</Link>
          </div>
        )}

        <section aria-label="What you'll get">
          <h2 className="mb-2 font-semibold">What you&apos;ll get</h2>
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
            {perks.map(([Icon, t, s]) => (
              <li key={t} className="flex w-40 shrink-0 flex-col gap-1 rounded-2xl bg-surface-2 p-3 sm:w-auto">
                <Icon className="h-4 w-4 text-primary" /><span className="text-sm font-semibold leading-tight">{t}</span><span className="text-xs leading-snug text-muted">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Modules">
          <h2 className="mb-2 font-semibold">Modules</h2>
          <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-3">
            {course.modules.map((m) => <ModuleCard key={m.id} module={m} hasAccess={hasAccess} compact />)}
          </div>
        </section>
      </div>
    </Shell>
  );
}
