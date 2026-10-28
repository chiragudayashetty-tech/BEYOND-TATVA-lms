import Link from "next/link";
import Billboard from "@/components/ott/Billboard";
import Row from "@/components/ott/Row";
import StudentFrame from "@/components/ott/StudentFrame";
import { ContinueCard, CourseCard, PosterCard, Top10Card } from "@/components/ott/Cards";
import Art from "@/components/ott/Art";
import { continueWatching, courses, featured, getCourse, liveSessions, newReleases, top10 } from "@/lib/catalog";

export const metadata = { title: "Home · Beyond Tatva" };

const goals = [
  { label: "Today's goal", value: "20 / 30 min", pct: 66, bg: "bg-yellow" },
  { label: "Quizzes this week", value: "4 of 5", pct: 80, bg: "bg-mint" },
  { label: "Class rank", value: "#3 of 42", pct: 92, bg: "bg-lilac" },
];

export default function Browse() {
  return (
    <StudentFrame>
      <div className="px-4 pt-6 sm:px-8 lg:px-12">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Hey Ananya 👋</h1>
        <p className="text-muted">Ready for today&apos;s 20 minutes of AI?</p>
      </div>

      <Billboard items={featured} />

      <div className="grid grid-cols-3 gap-2 px-4 pt-4 sm:gap-4 sm:px-8 lg:px-12">
        {goals.map((g) => (
          <div key={g.label} className={`rounded-3xl ${g.bg} p-3 sm:p-5`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70 sm:text-xs">{g.label}</div>
            <div className="mt-1 font-display text-base font-bold sm:text-2xl">{g.value}</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/60"><div className="h-full rounded-full bg-foreground" style={{ width: `${g.pct}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="pt-8">
        <Row title="Continue learning" emoji="▶️">
          {continueWatching.map((c) => <ContinueCard key={c.id} course={c} />)}
        </Row>

        <Row title="Top 10 at St. Mary's this week" emoji="🏆">
          {top10.map((c, i) => <Top10Card key={c.id} course={c} rank={i + 1} />)}
        </Row>

        <Row title="Fresh drops" emoji="✨" subtitle="New courses added this month">
          {[...newReleases, ...courses.filter((c) => !c.isNew)].map((c) => <CourseCard key={c.id} course={c} />)}
        </Row>

        <section className="mb-8 px-4 sm:px-8 lg:px-12">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold sm:text-2xl">
            <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-coral" /></span>
            Live classes
          </h2>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {liveSessions.map((s, i) => (
              <Link href="/live" key={s.title} className="group flex items-center gap-4 rounded-3xl border border-border bg-surface p-3 shadow-[0_4px_0_#e2e8f0] transition hover:-translate-y-1">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                  <Art course={getCourse(s.courseId)} seed={`live${i}`} />
                </div>
                <div>
                  {i === 0 && <span className="mb-1 inline-block rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">Live today</span>}
                  <div className="font-display font-semibold leading-snug">{s.title}</div>
                  <div className="text-xs text-muted">{s.when}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <Row title="Made for Grade 9" emoji="🎒">
          {courses.filter((c) => c.grade === "Grade 9" || c.grade === "All grades").map((c) => <PosterCard key={c.id} course={c} />)}
        </Row>

        <Row title="Build something cool" emoji="🛠️">
          {courses.filter((c) => c.tags.some((t) => ["Project", "Build", "Design", "Data"].includes(t))).map((c) => <CourseCard key={c.id} course={c} />)}
        </Row>
      </div>
    </StudentFrame>
  );
}
