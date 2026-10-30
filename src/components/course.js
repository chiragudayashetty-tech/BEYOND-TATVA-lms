import Link from "next/link";
import { Bot, Brain, CalendarClock, Gift, Lock, MessageSquareText, Palette, PenLine, PlayCircle, Sparkles, Wrench } from "lucide-react";
import Countdown from "./Countdown";
import { Badge, IconTile, Progress } from "./ui";
import { canWatch, fmtPremiere, isReleased } from "@/lib/catalog";

const moduleIcons = [Sparkles, Brain, PenLine, Wrench, MessageSquareText, Palette, Bot];
export const iconFor = (m) => moduleIcons[m?.n ?? 0] ?? Brain;

// What a viewer can do with a module right now.
export function moduleState(m, hasAccess, now = Date.now()) {
  if (!isReleased(m, now)) return "upcoming";
  if (!canWatch(m, hasAccess, now)) return "locked";
  if (m.progress === 100) return "done";
  if (m.progress > 0) return "progress";
  return "open";
}

export function frameSrc(m, i = 0) {
  const f = m?.frames;
  return f?.length ? `/media/frames/${f[i % f.length]}.jpg` : null;
}

/* eslint-disable @next/next/no-img-element */
export function Thumb({ module: m, i = 0, className = "", dim = false, children }) {
  const src = frameSrc(m, i);
  return (
    <div className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden bg-surface-2 ${className}`}>
      {src ? <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${dim ? "grayscale-[60%] opacity-60" : ""}`} />
        : <div className="grid h-full w-full place-items-center"><IconTile icon={iconFor(m)} size="lg" /></div>}
      {children}
    </div>
  );
}

function StateBadge({ m, state }) {
  if (state === "upcoming") return <Badge tone="primary"><CalendarClock className="h-3 w-3" /> {fmtPremiere(m.release)}</Badge>;
  if (state === "locked") return <Badge tone="neutral"><Lock className="h-3 w-3" /> Locked</Badge>;
  if (state === "done") return <Badge tone="success">Completed</Badge>;
  if (m.free) return <Badge tone="success"><Gift className="h-3 w-3" /> Free</Badge>;
  return <Badge tone="primary">Available</Badge>;
}

export function ModuleCard({ module: m, hasAccess, courseId = "ai-for-students" }) {
  const state = moduleState(m, hasAccess);
  const playable = state !== "upcoming" && state !== "locked";
  const next = m.lessons.find((l) => l.current) ?? m.lessons.find((l) => !l.done) ?? m.lessons[0];
  const href = playable ? `/watch/${courseId}?l=${next.n}` : state === "locked" ? "/unlock" : "/course#m" + m.n;
  return (
    <Link href={href} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <Thumb module={m} className="aspect-video" dim={!playable}>
        <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur">Module {m.n}</span>
        {playable && <span className="absolute inset-0 m-auto grid h-11 w-11 place-items-center rounded-full bg-white/95 text-[#0f172a] opacity-0 shadow-lg transition group-hover:opacity-100"><PlayCircle className="h-6 w-6" strokeWidth={1.75} /></span>}
        {!playable && <span className="absolute inset-0 m-auto grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur">{state === "upcoming" ? <CalendarClock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}</span>}
      </Thumb>
      <div className="flex flex-1 flex-col p-4">
        <StateBadge m={m} state={state} />
        <h3 className="mt-2 font-semibold leading-snug">{m.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{m.blurb}</p>
        <div className="mt-auto pt-4 text-xs text-muted">
          {state === "progress" || state === "done" ? (
            <div className="flex items-center gap-3"><Progress value={m.progress} tone={state === "done" ? "success" : "primary"} className="h-1.5" /><span className="font-medium text-fg">{m.progress}%</span></div>
          ) : state === "upcoming" ? (
            <span>Premieres in <span className="font-semibold text-fg"><Countdown to={m.release} compact /></span></span>
          ) : state === "locked" ? (
            <span className="font-medium text-primary">Unlock the full course</span>
          ) : (
            <span>{m.lessons.length} lessons · {m.mins} min</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Dark premiere card for the next module.
export function PremiereCard({ module: m, hasAccess }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0f172a] text-white">
      <Thumb module={m} className="absolute inset-0 opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/85 to-[#0f172a]/40" />
      <div className="relative flex h-full flex-col gap-5 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Next premiere · {fmtPremiere(m.release)}
          </div>
          <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Module {m.n}: {m.title}</h2>
          <p className="mt-1 max-w-md text-sm text-white/70">{m.blurb}</p>
        </div>
        <Countdown to={m.release} />
        <div className="flex flex-wrap gap-2">
          {hasAccess
            ? <span className="btn bg-white text-[#0f172a]"><CalendarClock className="h-4 w-4" /> You&apos;re all set for Sunday</span>
            : <Link href="/unlock" className="btn bg-white text-[#0f172a] hover:bg-white/90"><Lock className="h-4 w-4" /> Unlock to watch on Sunday</Link>}
        </div>
      </div>
    </div>
  );
}

export function ContinueHero({ course, module: m }) {
  const next = m.lessons.find((l) => l.current) ?? m.lessons.find((l) => !l.done) ?? m.lessons[0];
  return (
    <div className="card grid overflow-hidden sm:grid-cols-[1.1fr_1fr]">
      <Link href={`/watch/${course.id}?l=${next.n}`} className="group relative block">
        <Thumb module={m} i={next.n - 1} className="aspect-video h-full sm:aspect-auto">
          <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/30" />
          <span className="absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#0f172a] shadow-lg transition group-hover:scale-105"><PlayCircle className="h-7 w-7" strokeWidth={1.75} /></span>
        </Thumb>
      </Link>
      <div className="flex flex-col justify-center p-5 sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Continue · Module {m.n}</div>
        <h2 className="mt-2 text-xl font-semibold">{next.title}</h2>
        <p className="mt-1 text-sm text-muted">{m.title} · Lesson {next.idx} of {m.lessons.length}</p>
        <div className="mt-5 flex items-center gap-3 text-sm"><Progress value={m.progress} /><span className="shrink-0 font-semibold">{m.progress}%</span></div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/watch/${course.id}?l=${next.n}`} className="btn-primary">Resume lesson</Link>
          <Link href="/course" className="btn-secondary">All modules</Link>
        </div>
      </div>
    </div>
  );
}
