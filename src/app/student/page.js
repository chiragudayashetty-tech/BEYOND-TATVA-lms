import Link from "next/link";
import AppShell, { SectionTitle } from "@/components/AppShell";
import ModuleCard from "@/components/ModuleCard";
import { modules } from "@/lib/mock";
import { studentNav } from "@/lib/nav";

function Row({ title, items, wide }) {
  return (
    <section className="mb-10">
      <SectionTitle>{title}</SectionTitle>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
        {items.map((m) => <ModuleCard key={m.id} m={m} wide={wide} />)}
      </div>
    </section>
  );
}

export default function StudentHome() {
  const current = modules[0];
  return (
    <AppShell role="student" name="Ananya" nav={studentNav}>
      {/* Hero: continue watching */}
      <section
        className="relative mb-10 overflow-hidden rounded-3xl border border-border p-6 sm:p-10"
        style={{ background: `linear-gradient(120deg, #4f46e5 0%, #312e81 45%, #0f172a 100%)` }}
      >
        <div className="absolute -right-10 -top-10 text-[180px] opacity-20 sm:text-[240px]">{current.emoji}</div>
        <span className="chip bg-yellow text-[#0f172a]">🔥 5-day streak</span>
        <h1 className="mt-4 max-w-xl text-3xl font-bold sm:text-5xl">{current.title}</h1>
        <p className="mt-2 max-w-md text-indigo-100">Lesson 5 · Summarise any chapter in 2 minutes</p>
        <div className="mt-4 flex max-w-sm items-center gap-3 text-sm">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-teal" style={{ width: `${current.progress}%` }} />
          </div>
          {current.progress}%
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/student/lesson" className="btn bg-white px-6 py-3 text-[#0f172a]">▶ Continue</Link>
          <span className="btn bg-white/10 px-6 py-3 backdrop-blur">⏱ 32 min today</span>
        </div>
      </section>

      <Row title="Continue learning" items={modules.filter((m) => m.progress > 0 && m.progress < 100)} wide />
      <Row title="New for Grade 9" items={modules.filter((m) => m.progress === 0)} />

      <section id="certificates" className="mb-10">
        <SectionTitle>Your certificates</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.filter((m) => m.progress === 100).map((m) => (
            <div key={m.id} className="card flex items-center gap-4 border-yellow/30 bg-gradient-to-br from-yellow/10 to-transparent">
              <div className="text-4xl">🏆</div>
              <div>
                <div className="font-semibold">{m.title}</div>
                <div className="text-sm text-muted">Completed · Download PDF</div>
              </div>
            </div>
          ))}
          <div className="card grid place-items-center border-dashed text-sm text-muted">
            Finish AI Study Hacks to earn your next one ✨
          </div>
        </div>
      </section>
    </AppShell>
  );
}
