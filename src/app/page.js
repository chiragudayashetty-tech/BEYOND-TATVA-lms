import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, Check, CirclePlay, Flame, Gift, MessageSquareText, Plug, School, ShieldCheck, Smartphone, Sparkles, Trophy, Users, Zap } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { IconTile } from "@/components/ui";
import { ModuleCard } from "@/components/course";
import Countdown from "@/components/Countdown";
import { PRICE_INR, course, fmtPremiere, nextPremiere } from "@/lib/catalog";

// Rebuild every 5 minutes so the next premiere and module states roll over on Sundays.
export const revalidate = 300;

export const metadata = { title: "Beyond Tatva · AI education for Grades 8–10" };

const stats = [
  ["300+", "Students learning"],
  ["4", "Partner schools"],
  ["92%", "Weekly attendance"],
  ["6", "Weekly modules"],
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
  const next = nextPremiere();
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-4 sm:px-6">
          <Logo />
          <nav className="hidden gap-7 text-sm font-medium text-muted md:flex">
            <a href="#modules" className="hover:text-fg">Modules</a>
            <a href="#pricing" className="hover:text-fg">Pricing</a>
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
          <span className="chip border border-border bg-surface text-muted"><CalendarClock className="h-3.5 w-3.5 text-primary" /> New module every Sunday, 6 PM</span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Learn AI.<br />Study smarter.<br /><span className="text-primary">Build the future.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            AI for Students is a 6-week course for Grades 8–10. One module premieres every Sunday. Module 1 is free, so start today.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">Watch Module 1 free <ArrowRight className="h-4 w-4" /></Link>
            <a href="#modules" className="btn-secondary px-6 py-3 text-base"><CirclePlay className="h-4 w-4" /> See all 6 modules</a>
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

      <section id="modules" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-semibold">Six modules. One every Sunday.</h2>
            <p className="mt-2 text-muted">Watch each premiere at 6 PM, or catch up any time that week.</p>
          </div>
          {next && (
            <div className="rounded-2xl bg-[#0f172a] p-4 text-white">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">Module {next.n} premieres {fmtPremiere(next.release)}</div>
              <Countdown to={next.release} />
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {course.modules.map((m) => <ModuleCard key={m.id} module={m} hasAccess={false} />)}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold">Simple pricing</h2>
          <p className="mt-2 text-muted">Try the first module free. Unlock the rest when you&apos;re ready.</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {[
              { icon: Gift, name: "Free", price: "₹0", note: "Free account", points: ["Module 1: Study smarter with AI", "Quick checks and XP", "Parent dashboard"], cta: "Start free", primary: false },
              { icon: Sparkles, name: "Full course", price: `₹${PRICE_INR}`, note: "One time", points: ["All 6 modules as they premiere", "Weekly live doubt class", "Quizzes, project feedback, certificate"], cta: "Get full access", primary: true },
              { icon: School, name: "Schools", price: "Per student", note: "Invoiced to the school", points: ["Access keys for every student", "Teacher dashboard and reports", "On-campus workshop option"], cta: "Talk to us", primary: false },
            ].map((t) => (
              <div key={t.name} className={`card flex flex-col p-6 ${t.primary ? "border-primary ring-4 ring-primary/10" : ""}`}>
                <div className="flex items-center justify-between"><IconTile icon={t.icon} tone={t.primary ? "primary" : "neutral"} />{t.primary && <span className="chip bg-primary text-primary-fg">Most popular</span>}</div>
                <div className="mt-4 font-semibold">{t.name}</div>
                <div className="mt-2 flex items-baseline gap-1.5"><span className="font-display text-3xl font-semibold">{t.price}</span><span className="text-sm text-muted">{t.note}</span></div>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">{t.points.map((p) => <li key={p} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{p}</li>)}</ul>
                <Link href="/login" className={`${t.primary ? "btn-primary" : "btn-secondary"} mt-6 w-full`}>{t.cta}</Link>
              </div>
            ))}
          </div>
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
