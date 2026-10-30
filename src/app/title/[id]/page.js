import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Check, CircleCheck, Clock, FileText, Lock, PlayCircle, Sparkles, Users } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, IconTile, Progress } from "@/components/ui";
import { CourseCard, Thumb, iconFor } from "@/components/course";
import { courses, getCourse } from "@/lib/catalog";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const c = getCourse(id);
  return { title: c ? `${c.title} · Beyond Tatva` : "Beyond Tatva" };
}

const resources = [
  ["Lesson notes", "PDF · 1.2 MB"],
  ["Prompt cheat-sheet", "PDF · 340 KB"],
  ["Practice worksheet", "Google Sheet"],
  ["Project brief", "Doc"],
];

export default async function CoursePage({ params }) {
  const { id } = await params;
  const c = getCourse(id);
  if (!c) notFound();
  const next = c.lessons.find((l) => l.current) ?? c.lessons.find((l) => !l.done) ?? c.lessons[0];
  const resume = c.progress > 0 && c.progress < 100;
  const Icon = iconFor(c);
  const learn = c.lessons.slice(0, 6).map((l) => l.title);

  // A level is done when all its lessons are done; the first unfinished level is open; later ones stay locked.
  let opened = false;
  const levels = c.chapters.map((ch) => {
    const allDone = ch.lessons.every((l) => l.done);
    const state = allDone ? "done" : !opened ? ((opened = true), "open") : "locked";
    return { ...ch, state };
  });

  return (
    <Shell roles={["student", "teacher"]}>
      <Link href="/courses" className="btn-ghost -ml-3 mb-3"><ArrowLeft className="h-4 w-4" /> All courses</Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <div className="card overflow-hidden">
            <div className="grid md:grid-cols-[1fr_1.1fr]">
              <div className="p-6">
                <IconTile icon={Icon} size="lg" />
                <h1 className="mt-4 text-3xl font-semibold">{c.title}</h1>
                <p className="mt-2 text-muted">{c.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="primary">{c.grade}</Badge>
                  {c.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                </div>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5"><PlayCircle className="h-4 w-4" />{c.lessonCount} lessons</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{Math.round(c.mins / 6) / 10} hours</span>
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />214 students</span>
                </div>
              </div>
              <Link href={`/watch/${c.id}?l=${next.n}`} className="group relative block min-h-56">
                <Thumb course={c} i={next.n - 1} className="absolute inset-0">
                  <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
                  <span className="absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#0f172a] shadow-lg"><PlayCircle className="h-7 w-7" strokeWidth={1.75} /></span>
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white">Lesson {next.n} · {next.title}</span>
                </Thumb>
              </Link>
            </div>
          </div>

          <Card title="Learning roadmap">
            <ol className="relative space-y-1">
              {levels.map((lv, i) => (
                <li key={lv.title} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < levels.length - 1 && <span className="absolute left-4 top-9 h-[calc(100%-2rem)] w-px bg-border" />}
                  <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
                    lv.state === "done" ? "bg-success text-white" : lv.state === "open" ? "bg-primary text-primary-fg" : "bg-surface-2 text-subtle"}`}>
                    {lv.state === "done" ? <Check className="h-4 w-4" /> : lv.state === "locked" ? <Lock className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Level {i + 1}: {lv.title}</span>
                      <Badge tone={lv.state === "done" ? "success" : lv.state === "open" ? "primary" : "neutral"}>
                        {lv.state === "done" ? "Completed" : lv.state === "open" ? "In progress" : "Locked"}
                      </Badge>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {lv.lessons.map((l) => {
                        const locked = lv.state === "locked";
                        const Row = locked ? "div" : Link;
                        return (
                          <li key={l.id}>
                            <Row {...(locked ? {} : { href: `/watch/${c.id}?l=${l.n}` })}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${locked ? "text-subtle" : "hover:bg-surface-2"} ${l.current ? "bg-primary-soft" : ""}`}>
                              {l.done ? <CircleCheck className="h-[18px] w-[18px] text-success" /> : locked ? <Lock className="h-4 w-4" /> : <PlayCircle className="h-[18px] w-[18px] text-primary" />}
                              <span className="flex-1 font-medium">{l.n}. {l.title}</span>
                              {l.current && <Badge tone="primary">Up next</Badge>}
                              <span className="text-xs text-muted">{l.mins} min</span>
                            </Row>
                          </li>
                        );
                      })}
                      <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted">
                        <Sparkles className="h-[18px] w-[18px]" />
                        <span className="flex-1">Level {i + 1} quiz · 10 questions</span>
                        <span className="text-xs font-medium text-warning">+100 XP</span>
                      </li>
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <div className="text-sm text-muted">Your progress</div>
            <div className="mt-1 flex items-end justify-between">
              <span className="font-display text-3xl font-semibold">{c.progress}%</span>
              <span className="text-sm text-muted">{c.lessons.filter((l) => l.done).length} of {c.lessonCount} lessons</span>
            </div>
            <Progress value={c.progress} tone={c.progress === 100 ? "success" : "primary"} className="mt-3 h-2" />
            <Link href={`/watch/${c.id}?l=${next.n}`} className="btn-primary mt-5 w-full">
              {resume ? "Resume course" : c.progress === 100 ? "Watch again" : "Start course"}
            </Link>
          </Card>

          <Card title="What you'll learn">
            <ul className="space-y-2.5 text-sm">
              {learn.map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
              ))}
            </ul>
          </Card>

          <Card title="Resources">
            <ul className="space-y-2">
              {resources.map(([n, m]) => (
                <li key={n} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <IconTile icon={FileText} size="sm" tone="neutral" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n}</div>
                    <div className="text-xs text-muted">{m}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="card flex gap-4 p-5">
            <IconTile icon={Award} tone="warning" />
            <div>
              <div className="font-semibold">Certificate on completion</div>
              <p className="mt-1 text-sm text-muted">Finish every level and pass the quizzes to earn a certificate your school can verify.</p>
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">More like this</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {courses.filter((o) => o.id !== c.id).slice(0, 4).map((o) => <CourseCard key={o.id} course={o} />)}
        </div>
      </section>
    </Shell>
  );
}
