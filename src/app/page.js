import Link from "next/link";
import Logo from "@/components/Logo";
import { PosterCard } from "@/components/ott/Cards";
import { courses } from "@/lib/catalog";

const features = [
  { icon: "🎬", title: "Lessons that talk back", body: "The video pauses for quick questions, so students stay switched on.", bg: "bg-sky" },
  { icon: "👨‍👩‍👧", title: "Parents see screen time", body: "How long your child learns, and how it fits into their day.", bg: "bg-yellow" },
  { icon: "📊", title: "Teachers see everything", body: "Progress, quiz scores and time spent for every student.", bg: "bg-mint" },
  { icon: "🔌", title: "Plugs into your tools", body: "Google Sheets, CRMs, WhatsApp and automations.", bg: "bg-lilac" },
];

export default function Home() {
  return (
    <div className="glow min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/login" className="btn-primary hidden sm:inline-flex">Get started</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-8 sm:px-8 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="chip border-2 border-foreground bg-white">🎒 For Grades 8–10 · Udupi and beyond</span>
          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            Learn AI the way you <span className="relative inline-block"><span className="relative z-10">binge-watch</span><span className="absolute inset-x-0 bottom-1 -z-0 h-4 -rotate-1 rounded bg-yellow sm:h-6" /></span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            Bite-sized AI courses, lessons that ask you questions, and real projects. Progress parents and teachers can actually see.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-yellow px-8 py-4 text-base">Start learning →</Link>
            <Link href="/profiles" className="btn-ghost px-7 py-4 text-base">Explore the demo</Link>
          </div>
          <div className="mt-8 flex items-center gap-4 text-sm text-muted">
            <div className="flex -space-x-2">
              {["bg-sky", "bg-mint", "bg-yellow", "bg-lilac"].map((b, i) => <span key={b} className={`grid h-9 w-9 place-items-center rounded-full ${b} text-base ring-2 ring-background`}>{["🦊", "🐼", "🐯", "🐸"][i]}</span>)}
            </div>
            300+ students learning across 4 schools
          </div>
        </div>
        <div className="relative">
          <div className="absolute -left-4 -top-4 h-full w-full rotate-2 rounded-[2.5rem] bg-yellow" />
          <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-foreground bg-foreground shadow-[0_10px_0_#0f172a]">
            <video src="/media/hero1.mp4" poster="/media/frames/v1-1.jpg" autoPlay muted loop playsInline className="aspect-video w-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-2 animate-[float_5s_ease-in-out_infinite] rounded-2xl border-2 border-foreground bg-white px-4 py-3 shadow-[0_4px_0_#0f172a] sm:-left-8">
            <div className="text-xs font-semibold text-muted">Quick check</div>
            <div className="font-display font-bold">⚡ +10 XP</div>
          </div>
          <div className="absolute -right-2 -top-6 animate-[float_6s_ease-in-out_infinite] rounded-2xl border-2 border-foreground bg-mint px-4 py-3 shadow-[0_4px_0_#0f172a] sm:-right-6">
            <div className="font-display font-bold">🔥 5-day streak</div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <h2 className="mb-6 px-4 text-center font-display text-3xl font-bold sm:px-8">Courses students actually finish</h2>
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-4 sm:px-8 lg:justify-center">
          {courses.slice(0, 6).map((c) => <PosterCard key={c.id} course={c} />)}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className={`rounded-3xl ${f.bg} p-6`}>
            <div className="text-4xl">{f.icon}</div>
            <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-foreground/75">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} Beyond Tatva · AI education for the next generation
      </footer>
    </div>
  );
}
