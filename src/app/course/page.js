import Link from "next/link";
import { Award, CalendarClock, Check, ChevronDown, CircleCheck, Gift, KeyRound, Lock, PlayCircle, Sparkles } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, IconTile, Progress } from "@/components/ui";
import { PremiereCard, Thumb, iconFor, moduleState } from "@/components/course";
import Countdown from "@/components/Countdown";
import { fmtPremiere, isReleased, nextPremiere } from "@/lib/catalog";
import { getCourse } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Course · Beyond Tatva" };

const stateLabel = {
  open: ["success", "Available"],
  progress: ["primary", "In progress"],
  done: ["success", "Completed"],
  locked: ["neutral", "Locked"],
  upcoming: ["primary", "Upcoming"],
};

export default async function CoursePage() {
  const [{ hasAccess }, course] = await Promise.all([getSession(), getCourse()]);
  const next = nextPremiere(course);
  const released = course.modules.filter((m) => isReleased(m)).length;

  return (
    <Shell roles={["student", "teacher"]}>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <div className="card overflow-hidden">
            <div className="grid md:grid-cols-[1fr_1fr]">
              <div className="p-6">
                <Badge tone="primary">{course.grade}</Badge>
                <h1 className="mt-3 text-3xl font-semibold">{course.title}</h1>
                <p className="mt-2 text-muted">{course.description}</p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[[`0–${course.modules.length - 1}`, "Modules"], [String(course.lessonCount), "Lessons"], ["Sun", "6 PM weekly"]].map(([v, l]) => (
                    <div key={l} className="rounded-xl bg-surface-2 py-3">
                      <div className="font-display text-xl font-semibold">{v}</div>
                      <div className="text-xs text-muted">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-56">
                <video src={course.hero ?? undefined} poster={course.modules[1]?.thumb ?? course.modules[0]?.thumb} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </div>
          </div>

          {!hasAccess && (
            // Phones: the sidebar sits below every module, so surface the offer near the top too.
            <div className="card flex items-center gap-3 p-4 xl:hidden">
              <IconTile icon={Gift} tone="success" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">AI 101 is free</div>
                <div className="text-sm text-muted">Modules 1–6 for ₹{course.price}, one time</div>
              </div>
              <Link href="/unlock" className="btn-primary shrink-0 px-4">Unlock</Link>
            </div>
          )}

          {next && <PremiereCard module={next} hasAccess={hasAccess} />}

          <Card title="Modules" action={<span className="text-sm text-muted">{released} of {course.modules.length} out</span>}>
            <ol className="relative">
              {course.modules.map((m, i) => {
                const state = moduleState(m, hasAccess);
                const playable = state !== "upcoming" && state !== "locked";
                const Icon = iconFor(m);
                return (
                  <li key={m.id} id={`m${m.n}`} className="relative flex scroll-mt-24 gap-4 pb-6 last:pb-0">
                    {i < course.modules.length - 1 && <span className="absolute left-5 top-12 h-[calc(100%-3rem)] w-px bg-border" />}
                    <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      state === "done" ? "bg-success text-white" : playable ? "bg-primary text-primary-fg" : "bg-surface-2 text-subtle"}`}>
                      {state === "done" ? <Check className="h-5 w-5" /> : state === "locked" ? <Lock className="h-4 w-4" /> : state === "upcoming" ? <CalendarClock className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <Thumb module={m} className="aspect-video w-full shrink-0 rounded-xl sm:w-44" dim={!playable} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-subtle">Module {m.n}</span>
                            <Badge tone={stateLabel[state][0]}>{stateLabel[state][1]}</Badge>
                            {m.free && <Badge tone="success"><Gift className="h-3 w-3" /> Free</Badge>}
                          </div>
                          <h3 className="mt-1 text-lg font-semibold">{m.title}</h3>
                          <p className="mt-0.5 text-sm text-muted">{m.blurb}</p>
                          <div className="mt-2 text-xs text-muted">
                            {state === "upcoming"
                              ? <>Premieres {fmtPremiere(m.release)} · in <span className="font-semibold text-fg"><Countdown to={m.release} compact /></span></>
                              : <>{m.lessons.length} lessons · {m.mins} min</>}
                          </div>
                          {(state === "progress" || state === "done") && <Progress value={m.progress} tone={state === "done" ? "success" : "primary"} className="mt-3 h-1.5 max-w-xs" />}
                        </div>
                      </div>

                      {(() => {
                        const list = (
                          <ul className="mt-3 space-y-1">
                            {m.lessons.map((l, li) => {
                              const Row = playable ? Link : "div";
                              return (
                                <li key={l.id}>
                                  <Row {...(playable ? { href: `/watch/${course.id}?l=${l.n}` } : {})}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${playable ? "hover:bg-surface-2" : "text-subtle"} ${l.current ? "bg-primary-soft" : ""}`}>
                                    {l.done ? <CircleCheck className="h-4 w-4 text-success" /> : playable ? <PlayCircle className="h-4 w-4 text-primary" /> : <Lock className="h-3.5 w-3.5" />}
                                    <span className="flex-1 font-medium">{li + 1}. {l.title}</span>
                                    {l.current && <Badge tone="primary">Up next</Badge>}
                                    <span className="text-xs text-muted">{l.mins} min</span>
                                  </Row>
                                </li>
                              );
                            })}
                            <li className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${playable ? "text-muted" : "text-subtle"}`}>
                              <Sparkles className="h-4 w-4" /><span className="flex-1">Module {m.n} quiz</span><span className="text-xs font-medium text-warning">+100 XP</span>
                            </li>
                          </ul>
                        );
                        // Locked and upcoming modules fold their lessons away to keep the page short on phones.
                        return playable ? list : (
                          <details className="group mt-2">
                            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /> See what&apos;s inside ({m.lessons.length} lessons)
                            </summary>
                            {list}
                          </details>
                        );
                      })()}

                      {state === "locked" && (
                        <Link href="/unlock" className="btn-secondary mt-3"><KeyRound className="h-4 w-4" /> Unlock module {m.n}</Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className={hasAccess ? "" : "hidden xl:block"}>
            {hasAccess ? (
              <>
                <IconTile icon={CircleCheck} tone="success" />
                <h2 className="mt-3 font-semibold">Full course unlocked</h2>
                <p className="mt-1 text-sm text-muted">New modules appear here every Sunday at 6 PM.</p>
              </>
            ) : (
              <>
                <IconTile icon={Gift} tone="success" />
                <h2 className="mt-3 font-semibold">AI 101 is free</h2>
                <p className="mt-1 text-sm text-muted">Unlock modules 1–6 with a key from your school, or pay once online.</p>
                <div className="mt-4 flex items-baseline gap-1"><span className="font-display text-3xl font-semibold">₹{course.price}</span><span className="text-sm text-muted">one time</span></div>
                <Link href="/unlock" className="btn-primary mt-4 w-full">Unlock full course</Link>
                <Link href="/unlock#key" className="btn-ghost mt-1 w-full">I have an access key</Link>
              </>
            )}
          </Card>

          <Card title="Your progress">
            <div className="flex items-end justify-between">
              <span className="font-display text-3xl font-semibold">{course.progress}%</span>
              <span className="text-sm text-muted">{course.lessons.filter((l) => l.done).length} of {course.lessonCount} lessons</span>
            </div>
            <Progress value={course.progress} className="mt-3 h-2" />
          </Card>

          <Card title="What you'll get">
            <ul className="space-y-2.5 text-sm">
              {[`${course.lessonCount} short video lessons with quick checks`, "A quiz at the end of every module", "A final project: your own chatbot", "A certificate your school can verify"].map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
              ))}
            </ul>
          </Card>

          <div className="card flex gap-4 p-5">
            <IconTile icon={Award} tone="warning" />
            <div>
              <div className="font-semibold">Certificate</div>
              <p className="mt-1 text-sm text-muted">Finish every module and its quiz to earn it.</p>
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
