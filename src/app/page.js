import Link from "next/link";
import Logo from "@/components/Logo";
import ModuleCard from "@/components/ModuleCard";
import { modules } from "@/lib/mock";

const features = [
  { icon: "🎬", title: "Lessons that talk back", body: "Smooth video with questions that pop up mid-lesson, so students stay switched on." },
  { icon: "👨‍👩‍👧", title: "Parents see screen time", body: "Know how long your child learns, and how that fits into their day." },
  { icon: "📊", title: "Teachers see everything", body: "Progress, quiz scores and time spent for every student in one view." },
  { icon: "🔌", title: "Connects to your tools", body: "Google Sheets, CRMs, WhatsApp and automations, without the copy-paste." },
];

export default function Home() {
  return (
    <div className="glow min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/login" className="btn-primary hidden sm:inline-flex">Get started</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:pt-20">
        <span className="chip border border-teal/40 bg-teal/10 text-teal">For Grades 8–10 · Udupi & beyond</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Learn AI the way you <span className="bg-gradient-to-r from-indigo-400 via-teal to-yellow bg-clip-text text-transparent">binge-watch</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Bite-sized AI courses, interactive lessons and real projects, with progress that parents and teachers can actually see.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn-yellow px-7 py-3 text-base">Start learning →</Link>
          <Link href="/dashboard" className="btn-ghost px-7 py-3 text-base">Explore the demo</Link>
        </div>
      </section>

      <section className="pb-16">
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-4 sm:justify-center">
          {modules.slice(0, 4).map((m) => (
            <ModuleCard key={m.id} m={m} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} Beyond Tattva · AI education for the next generation
      </footer>
    </div>
  );
}
