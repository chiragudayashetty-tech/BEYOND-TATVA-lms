import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, KeyRound, Lock } from "lucide-react";
import Shell from "@/components/shell/Shell";
import Countdown from "@/components/Countdown";
import { Thumb } from "@/components/course";
import { PRICE_INR, canWatch, fmtPremiere, getCourse, isReleased, moduleOfLesson } from "@/lib/catalog";
import { getSession } from "@/lib/supabase/server";
import LessonView from "./LessonView";

export const metadata = { title: "Lesson · Beyond Tatva" };

function LockScreen({ module: m }) {
  const upcoming = !isReleased(m);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/course" className="btn-ghost -ml-3 mb-3"><ArrowLeft className="h-4 w-4" /> Course</Link>
      <div className="relative overflow-hidden rounded-2xl bg-[#0f172a] text-white">
        <Thumb module={m} className="absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-[#0f172a]/70" />
        <div className="relative flex aspect-video flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            {upcoming ? <CalendarClock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Module {m.n}</div>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{m.title}</h1>
            <p className="mt-2 text-sm text-white/70">
              {upcoming ? `Premieres ${fmtPremiere(m.release)}` : "This module is part of the full course."}
            </p>
          </div>
          {upcoming && <Countdown to={m.release} />}
          {!m.free && (
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/unlock" className="btn bg-white text-[#0f172a] hover:bg-white/90"><KeyRound className="h-4 w-4" /> Unlock for ₹{PRICE_INR}</Link>
              <Link href="/unlock#key" className="btn border border-white/25 text-white hover:bg-white/10">I have a key</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function WatchPage({ params, searchParams }) {
  const { id } = await params;
  const { l } = await searchParams;
  const course = getCourse(id);
  if (!course) notFound();
  const { hasAccess } = await getSession();
  const lesson = course.lessons.find((x) => x.n === Number(l)) ?? course.lessons.find((x) => x.current) ?? course.lessons[0];
  const m = moduleOfLesson(lesson);

  return (
    <Shell roles={["student", "teacher"]}>
      {canWatch(m, hasAccess)
        ? <LessonView key={lesson.id} course={course} lesson={lesson} hasAccess={hasAccess} />
        : <LockScreen module={m} />}
    </Shell>
  );
}
