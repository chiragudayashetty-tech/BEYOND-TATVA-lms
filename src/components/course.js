import Link from "next/link";
import { BookOpen, Brain, Clock, FlaskConical, MessageSquareText, Bot, Palette, PenLine, PlayCircle, ShieldCheck, ChartBar } from "lucide-react";
import { IconTile, Progress } from "./ui";

export const courseIcon = {
  "ai-study-hacks": Brain,
  "ai-for-creativity": Palette,
  "exam-mode": PenLine,
  "prompt-power": MessageSquareText,
  "build-a-chatbot": Bot,
  "ai-and-me": ShieldCheck,
  "ai-in-science": FlaskConical,
  "data-detectives": ChartBar,
};

export const iconFor = (course) => courseIcon[course.id] ?? BookOpen;

const hours = (mins) => `${Math.round(mins / 6) / 10}h`;

// A real frame from the course's lesson footage.
export function frameSrc(course, i = 0) {
  const f = course.frames;
  return f?.length ? `/media/frames/${f[i % f.length]}.jpg` : null;
}

/* eslint-disable @next/next/no-img-element */
export function Thumb({ course, i = 0, className = "", children }) {
  const src = frameSrc(course, i);
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center"><IconTile icon={iconFor(course)} size="lg" /></div>
      )}
      {children}
    </div>
  );
}

export function CourseCard({ course }) {
  const started = course.progress > 0;
  return (
    <Link href={`/title/${course.id}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <Thumb course={course} className="aspect-video">
        {course.isNew && <span className="chip absolute left-3 top-3 bg-surface text-fg shadow-sm">New</span>}
        {course.progress === 100 && <span className="chip absolute left-3 top-3 bg-success text-white">Completed</span>}
      </Thumb>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          {(() => { const I = iconFor(course); return <I className="h-3.5 w-3.5" />; })()}
          {course.tags[0]}
        </div>
        <h3 className="mt-1.5 font-semibold leading-snug">{course.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{course.tagline}</p>
        <div className="mt-auto pt-4">
          {started ? (
            <div className="flex items-center gap-3 text-xs text-muted">
              <Progress value={course.progress} tone={course.progress === 100 ? "success" : "primary"} className="h-1.5" />
              <span className="shrink-0 font-medium text-fg">{course.progress}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>{course.grade}</span>
              <span className="h-1 w-1 rounded-full bg-subtle" />
              <span>{course.lessonCount} lessons</span>
              <span className="h-1 w-1 rounded-full bg-subtle" />
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{hours(course.mins)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Compact row used in lists (My Courses on mobile, teacher pages).
export function CourseRow({ course, href }) {
  const I = iconFor(course);
  return (
    <Link href={href ?? `/title/${course.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
      <IconTile icon={I} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{course.title}</div>
        <div className="truncate text-xs text-muted">{course.lessonCount} lessons · {course.grade}</div>
      </div>
      <span className="text-sm font-semibold">{course.progress}%</span>
    </Link>
  );
}

export function ContinueHero({ course }) {
  const next = course.lessons.find((l) => l.current) ?? course.lessons[0];
  return (
    <div className="card grid overflow-hidden sm:grid-cols-[1.1fr_1fr]">
      <Link href={`/watch/${course.id}?l=${next.n}`} className="group relative block">
        <Thumb course={course} i={next.n - 1} className="aspect-video h-full sm:aspect-auto">
          <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/30" />
          <span className="absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#0f172a] shadow-lg transition group-hover:scale-105">
            <PlayCircle className="h-7 w-7" strokeWidth={1.75} />
          </span>
        </Thumb>
      </Link>
      <div className="flex flex-col justify-center p-5 sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Continue learning</div>
        <h2 className="mt-2 text-xl font-semibold">{course.title}</h2>
        <p className="mt-1 text-sm text-muted">Lesson {next.n} · {next.title}</p>
        <div className="mt-5 flex items-center gap-3 text-sm">
          <Progress value={course.progress} />
          <span className="shrink-0 font-semibold">{course.progress}%</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/watch/${course.id}?l=${next.n}`} className="btn-primary">Resume lesson</Link>
          <Link href={`/title/${course.id}`} className="btn-secondary">Course details</Link>
        </div>
      </div>
    </div>
  );
}
