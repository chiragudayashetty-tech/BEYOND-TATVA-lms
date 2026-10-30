import Link from "next/link";
import { ArrowRight, BarChart3, CirclePlay, Flame, MessageSquareText, Plug, ShieldCheck, Smartphone, Sparkles, Trophy, Users, Zap } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { IconTile } from "@/components/ui";
import { CourseCard } from "@/components/course";
import { courses } from "@/lib/catalog";

export const metadata = { title: "Beyond Tatva · AI education for Grades 8–10" };

const stats = [
  ["300+", "Students learning"],
  ["4", "Partner schools"],
  ["92%", "Weekly attendance"],
  ["8", "Courses and growing"],
];

const roadmap = [
  ["Understand", "What AI is and how to talk to it"],
  ["Study smarter", "Summaries, flashcards, practice tests"],
  ["Create", "Design, writing and music with AI"],
  ["Think", "Fact-checking, ethics and safety"],
  ["Build", "Your own chatbot, presented to class"],
];

const audiences = [
  {
    title: "For students",
    icon: Zap,
    points: ["Short video lessons that ask you questions", "XP, streaks, badges and a class leaderboard", "Study planner, assignments and certificates"],
  },
  {
    title: "For parents",
    icon: ShieldCheck,
    points: ["See progress and quiz scores every week", "Learning time next to total screen time", "Consent and data handled under the DPDP Act"],
  },
  {
    title: "For schools",
    icon: BarChart3,
    points: ["Class dashboards with time spent and scores", "Alerts when a student starts slipping", "Exports to Google Sheets and your CRM"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-4 sm:px-6">
          <Logo />
          <nav className="hidden gap-7 text-sm font-medium text-muted md:flex">
            <a href="#courses" className="hover:text-fg">Courses</a>
            <a href="#roadmap" className="hover:text-fg">Roadmap</a>
            <a href="#who" className="hover:text-fg">For schools</a>
            <a href="#who" className="hover:text-fg">For parents</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Log in</Link>
            <Link href="/login" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
        <div>
          <span className="chip border border-border bg-surface text-muted"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI education for Grades 8–10</span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Learn AI.<br />Study smarter.<br /><span className="text-primary">Build the future.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            Short video lessons, real projects and progress that parents and teachers can actually see. Made in Udupi for students across India.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">Start learning <ArrowRight className="h-4 w-4" /></Link>
            <a href="#courses" className="btn-secondary px-6 py-3 text-base"><CirclePlay className="h-4 w-4" /> Explore courses</a>
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted">
            <Users className="h-4 w-4" /> Trusted by 4 schools and 300+ students
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-2xl shadow-black/5">
            <video src="/media/hero1.mp4" poster="/media/frames/v1-1.jpg" autoPlay muted loop playsInline className="aspect-video w-full rounded-2xl object-cover" />
          </div>
          <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:-left-6">
            <IconTile icon={MessageSquareText} size="sm" />
            <div>
              <div className="text-xs text-muted">Quick check</div>
              <div className="text-sm font-semibold">Correct, +10 XP</div>
            </div>
          </div>
          <div className="absolute -right-3 -top-5 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:-right-6">
            <IconTile icon={Flame} size="sm" tone="warning" />
            <div>
              <div className="text-xs text-muted">Streak</div>
              <div className="text-sm font-semibold">12 days</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-6 rounded-3xl bg-[#0f172a] px-6 py-8 text-white sm:px-10 lg:grid-cols-4">
          {stats.map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-semibold sm:text-4xl">{n}</div>
              <div className="mt-1 text-sm text-white/70">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">Top courses</h2>
            <p className="mt-2 text-muted">Bite-sized, practical and built for school students.</p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">View all courses <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.slice(0, 4).map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      <section id="roadmap" className="scroll-mt-20 border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold">The learning roadmap</h2>
          <p className="mt-2 text-muted">A clear path from first prompt to first project.</p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {roadmap.map(([t, d], i) => (
              <li key={t} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft font-semibold text-primary">{i + 1}</span>
                  <span className="hidden h-px flex-1 bg-border lg:block" />
                </div>
                <div className="mt-4 font-semibold">{t}</div>
                <div className="mt-1 text-sm text-muted">{d}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="who" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold">One platform, three views</h2>
        <p className="mt-2 text-muted">Everyone sees exactly what they need, and nothing they shouldn&apos;t.</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="card p-6">
              <IconTile icon={a.icon} size="lg" />
              <h3 className="mt-5 text-lg font-semibold">{a.title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                {a.points.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[[Trophy, "Challenges and leaderboards"], [Smartphone, "Works great on any phone"], [Plug, "Connects to Sheets, CRMs and WhatsApp"]].map(([I, t]) => (
            <div key={t} className="card flex items-center gap-3 p-4 text-sm font-medium"><IconTile icon={I} size="sm" tone="neutral" />{t}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">Bring Beyond Tatva to your school</h2>
            <p className="mt-2 text-white/80">Workshops and full courses for Grades 8–10, with a dashboard for every teacher.</p>
          </div>
          <Link href="/login" className="btn shrink-0 bg-white px-6 py-3 text-base text-[#0f172a] hover:bg-white/90">Get started <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <Logo />
          <span>© {new Date().getFullYear()} Beyond Tatva, Udupi. AI education for the next generation.</span>
        </div>
      </footer>
    </div>
  );
}
