import Link from "next/link";
import { CalendarClock, CheckCircle2, Flame, Gift, KeyRound, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, IconTile, StatCard, ViewAll } from "@/components/ui";
import { ContinueHero, ModuleCard, PremiereCard } from "@/components/course";
import { canWatch, isReleased, nextPremiere } from "@/lib/catalog";
import { getCourse, getStudentStats } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard · Beyond Tatva" };

export default async function Dashboard() {
  const [{ hasAccess }, course, stats] = await Promise.all([getSession(), getCourse(), getStudentStats()]);
  const next = nextPremiere(course);
  const released = course.modules.filter((m) => isReleased(m)).length;
  const current = course.modules.find((m) => m.progress < 100 && m.lessons.length && canWatch(m, hasAccess)) ?? course.modules[0];
  const done = course.lessons.filter((l) => l.done).length;

  return (
    <Shell roles={["student"]} greeting>
      {!hasAccess && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 lg:mb-6">
          <IconTile icon={Gift} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">You&apos;re on the free plan: AI 101 is yours</div>
            <div className="text-sm text-muted">Unlock the other modules with your school&apos;s access key or a one-time payment.</div>
          </div>
          <Link href="/unlock" className="btn-primary"><KeyRound className="h-4 w-4" /> Unlock course</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Modules out" value={`${released} / ${course.modules.length}`} hint="New one every Sunday" icon={CalendarClock} />
        <StatCard label="Lessons done" value={`${done} / ${course.lessonCount}`} hint={`${course.progress}% of the course`} icon={CheckCircle2} tone="success" />
        <StatCard label="XP" value={stats.xp} hint="10 XP per correct quick check" icon={Zap} tone="warning" />
        <StatCard label="Streak" value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`} hint={stats.streak ? "Keep it going today" : "Learn today to start one"} icon={Flame} tone="danger" />
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ContinueHero course={course} module={current} />
        {next ? <PremiereCard module={next} hasAccess={hasAccess} /> : (
          <Card title="All modules are out"><p className="text-sm text-muted">Finish the course to earn your certificate.</p></Card>
        )}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your journey</h2>
            <p className="text-sm text-muted">A new module premieres every Sunday at 6 PM.</p>
          </div>
          <ViewAll href="/course">Course page</ViewAll>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {course.modules.map((m) => (
            <div key={m.id} className="w-[78vw] shrink-0 snap-start sm:w-auto"><ModuleCard module={m} hasAccess={hasAccess} courseId={course.id} /></div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
