import Link from "next/link";
import Art from "./Art";
import { Check, Play, Plus } from "./Icons";

function Badges({ course }) {
  return (
    <div className="absolute left-3 top-3 flex gap-1">
      {course.isNew && <span className="rounded-full bg-yellow px-2 py-0.5 text-[10px] font-extrabold uppercase">New</span>}
      {course.progress === 100 && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase text-teal">✓ Done</span>}
    </div>
  );
}

function CoverTitle({ course, size = "text-xl" }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 p-4 font-display font-extrabold leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_6px_rgba(15,23,42,.35)] ${size}`}>
      {course.title}
    </div>
  );
}

// Landscape course card: lifts and tilts slightly on hover, details underneath.
export function CourseCard({ course }) {
  return (
    <Link href={`/title/${course.id}`} className="group/card w-[62vw] shrink-0 snap-start sm:w-[34vw] md:w-[26vw] lg:w-[21vw]">
      <div className="relative aspect-video overflow-hidden rounded-3xl shadow-[0_6px_0_rgba(15,23,42,0.08)] transition duration-300 group-hover/card:-translate-y-1.5 group-hover/card:-rotate-1 group-hover/card:shadow-[0_12px_0_rgba(15,23,42,0.08)]">
        <Art course={course} className="transition duration-500 group-hover/card:scale-110" />
        <Badges course={course} />
        <CoverTitle course={course} />
        <span className="absolute bottom-3 right-3 grid h-10 w-10 scale-75 place-items-center rounded-full bg-white text-foreground opacity-0 shadow-lg transition group-hover/card:scale-100 group-hover/card:opacity-100">
          <Play className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 px-1 text-xs font-medium text-muted">
        <span className="rounded-full px-2 py-0.5 text-foreground" style={{ background: `${course.color2}66` }}>{course.grade}</span>
        <span>{course.lessonCount} lessons</span>
        <span>·</span>
        <span>{Math.round(course.mins / 6) / 10}h</span>
      </div>
    </Link>
  );
}

export function ContinueCard({ course }) {
  const next = course.lessons.find((l) => l.current) ?? course.lessons[0];
  return (
    <Link href={`/watch/${course.id}`} className="group/card flex w-[85vw] shrink-0 snap-start gap-4 rounded-3xl border border-border bg-surface p-3 shadow-[0_4px_0_#e2e8f0] transition hover:-translate-y-1 sm:w-[48vw] md:w-[38vw] lg:w-[30vw]">
      <div className="relative aspect-video w-[45%] shrink-0 overflow-hidden rounded-2xl">
        <Art course={course} seed={next.id} />
        <span className="absolute inset-0 m-auto grid h-11 w-11 place-items-center rounded-full bg-white/95 text-foreground shadow-lg transition group-hover/card:scale-110">
          <Play className="h-4 w-4" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: course.color }}>{course.title}</div>
        <div className="mt-0.5 line-clamp-2 font-display font-semibold leading-snug">L{next.n}. {next.title}</div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-yellow" style={{ width: `${course.progress}%` }} /></div>
          {course.progress}%
        </div>
      </div>
    </Link>
  );
}

// Chunky rank number next to a tall poster.
export function Top10Card({ course, rank }) {
  return (
    <Link href={`/title/${course.id}`} className="group/card flex w-[60vw] shrink-0 snap-start items-end sm:w-[36vw] md:w-[27vw] lg:w-[21vw]">
      <span
        className="-mr-[6%] select-none font-display text-[40vw] font-black leading-[0.72] text-white sm:text-[24vw] md:text-[18vw] lg:text-[14vw]"
        style={{ WebkitTextStroke: "4px #0f172a" }}
      >
        {rank}
      </span>
      <div className="relative aspect-[2/3] w-[56%] overflow-hidden rounded-3xl shadow-[0_6px_0_rgba(15,23,42,0.1)] transition duration-300 group-hover/card:-translate-y-1.5 group-hover/card:rotate-1">
        <Art course={course} seed="poster" />
        <Badges course={course} />
        <CoverTitle course={course} size="text-lg" />
      </div>
    </Link>
  );
}

export function PosterCard({ course }) {
  return (
    <Link href={`/title/${course.id}`} className="group/card w-[40vw] shrink-0 snap-start sm:w-[24vw] md:w-[18vw] lg:w-[14vw]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-3xl shadow-[0_6px_0_rgba(15,23,42,0.08)] transition duration-300 group-hover/card:-translate-y-1.5 group-hover/card:rotate-1">
        <Art course={course} seed="poster" />
        <Badges course={course} />
        <CoverTitle course={course} size="text-lg" />
      </div>
    </Link>
  );
}

export function ListToggle({ inList, dark }) {
  return (
    <button
      className={`grid h-12 w-12 place-items-center rounded-full border-2 transition ${dark ? "border-foreground/20 bg-white hover:border-foreground" : "border-white/60 bg-white/20 text-white backdrop-blur hover:bg-white/30"}`}
      aria-label={inList ? "Remove from My List" : "Add to My List"}
    >
      {inList ? <Check /> : <Plus />}
    </button>
  );
}
