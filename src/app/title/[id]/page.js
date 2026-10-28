import Link from "next/link";
import { notFound } from "next/navigation";
import StudentFrame from "@/components/ott/StudentFrame";
import Row from "@/components/ott/Row";
import Art from "@/components/ott/Art";
import { CourseCard, ListToggle } from "@/components/ott/Cards";
import { Check, FileText, Play } from "@/components/ott/Icons";
import { courses, getCourse } from "@/lib/catalog";

export function generateStaticParams() {
  return courses.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const c = getCourse(id);
  return { title: c ? `${c.title} · Beyond Tatva` : "Beyond Tatva" };
}

const resources = [
  { name: "Lesson notes", type: "PDF", icon: "📄" },
  { name: "Prompt cheat-sheet", type: "PDF", icon: "💬" },
  { name: "Practice worksheet", type: "Sheet", icon: "📝" },
  { name: "Project brief", type: "Doc", icon: "🛠️" },
];

export default async function TitlePage({ params }) {
  const { id } = await params;
  const c = getCourse(id);
  if (!c) notFound();
  const next = c.lessons.find((l) => l.current) ?? c.lessons.find((l) => !l.done) ?? c.lessons[0];
  const resume = c.progress > 0 && c.progress < 100;

  return (
    <StudentFrame>
      {/* Hero */}
      <section className="px-4 pt-4 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0"><Art course={c} seed="hero" /></div>
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/40 to-transparent" />
          <div className="relative flex min-h-[420px] flex-col justify-end p-6 text-white sm:min-h-[460px] sm:p-10 lg:p-14">
            <Link href="/browse" className="absolute left-6 top-6 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur hover:bg-white/30 sm:left-10 sm:top-8">← Back</Link>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-yellow px-3 py-1 text-foreground">{c.grade}</span>
              {c.tags.map((t) => <span key={t} className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{t}</span>)}
            </div>
            <h1 className="mt-4 max-w-2xl font-display text-5xl font-extrabold leading-[0.92] tracking-tight sm:text-6xl">{c.title}</h1>
            <p className="mt-2 font-ui text-xl font-medium">{c.tagline}</p>
            <p className="mt-3 max-w-xl text-white/85">{c.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={`/watch/${c.id}`} className="btn-yellow px-7 py-3.5 text-base">
                <Play className="h-5 w-5" /> {resume ? `Resume L${next.n}` : c.progress === 100 ? "Watch again" : "Start course"}
              </Link>
              <ListToggle />
              <div className="ml-1 text-sm text-white/85">
                {c.lessonCount} lessons · {Math.round(c.mins / 6) / 10} hours
              </div>
            </div>
            {c.progress > 0 && (
              <div className="mt-5 flex max-w-sm items-center gap-3 text-sm">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-yellow" style={{ width: `${c.progress}%` }} /></div>
                <span className="font-semibold">{c.progress}% done</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-8 px-4 pt-8 sm:px-8 lg:grid-cols-[1fr_320px] lg:px-12">
        {/* Lessons */}
        <div>
          {c.chapters.map((ch, ci) => (
            <section key={ch.title} className="mb-8">
              <h2 className="mb-3 font-display text-xl font-bold">
                <span className="mr-2 rounded-full bg-foreground px-2.5 py-0.5 text-sm text-white">Level {ci + 1}</span>
                {ch.title}
              </h2>
              <ol className="space-y-3">
                {ch.lessons.map((l) => (
                  <li key={l.id}>
                    <Link href={`/watch/${c.id}?l=${l.n}`} className={`group flex items-center gap-4 rounded-3xl border bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-[0_4px_0_#e2e8f0] ${l.current ? "border-foreground" : "border-border"}`}>
                      <span className="w-6 shrink-0 text-center font-display text-lg font-bold text-muted">{l.n}</span>
                      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-2xl sm:w-44">
                        <Art course={c} seed={`${c.id}-${l.n - 1}`} />
                        <span className="absolute inset-0 m-auto grid h-9 w-9 place-items-center rounded-full bg-white/95 opacity-0 shadow transition group-hover:opacity-100"><Play className="h-4 w-4" /></span>
                        {l.done && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-mint text-foreground"><Check className="h-3.5 w-3.5" /></span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-semibold">{l.title}</span>
                          {l.current && <span className="chip bg-yellow">Up next</span>}
                        </div>
                        <div className="mt-1 text-sm text-muted">{l.mins} min · Video + quick check</div>
                        {l.done && <div className="mt-2 h-1.5 w-24 rounded-full bg-mint" />}
                      </div>
                    </Link>
                  </li>
                ))}
                <li className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-border p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lilac/30 text-lg">🧠</span>
                  <div>
                    <div className="font-display font-semibold">Level {ci + 1} quiz</div>
                    <div className="text-sm text-muted">10 questions · earn up to 100 XP</div>
                  </div>
                </li>
              </ol>
            </section>
          ))}
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          <div className="card">
            <h3 className="font-display text-lg font-bold">Resources</h3>
            <ul className="mt-3 space-y-2">
              {resources.map((r) => (
                <li key={r.name} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
                  <span className="text-xl">{r.icon}</span>
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="chip bg-white text-muted"><FileText className="mr-1 h-3 w-3" />{r.type}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-yellow p-5">
            <div className="text-3xl">🏆</div>
            <h3 className="mt-2 font-display text-lg font-bold">Earn your certificate</h3>
            <p className="mt-1 text-sm text-foreground/80">Finish every lesson and pass the quizzes to get a certificate your school can verify.</p>
          </div>
          <div className="card">
            <h3 className="font-display text-lg font-bold">Your project</h3>
            <p className="mt-1 text-sm text-muted">Submit your work at the end and get instant AI feedback, then your teacher&apos;s review.</p>
          </div>
        </aside>
      </div>

      <div className="pt-4">
        <Row title="More like this" emoji="👀">
          {courses.filter((o) => o.id !== c.id).map((o) => <CourseCard key={o.id} course={o} />)}
        </Row>
      </div>
    </StudentFrame>
  );
}
