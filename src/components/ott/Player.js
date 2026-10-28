"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Art from "./Art";
import { ArrowLeft, Back10, Captions, Expand, Fwd10, List, Pause, Play, SkipNext, Volume } from "./Icons";

// Demo lesson video and its in-video questions. Real lessons will carry their own checkpoints.
const VIDEO = "/media/lesson1.mp4";
const POSTER = "/media/lesson1-poster.jpg";
const CHECKPOINTS = [
  {
    at: 58,
    question: "Which AI tool can you use for this study method?",
    options: ["Only ChatGPT", "ChatGPT, or Gemini works too", "Neither, use Google search"],
    answer: 1,
    explain: "Both work. Use whichever one your family already has.",
  },
  {
    at: 125,
    question: "Should you write the rice example in your exam answer?",
    options: ["Yes, examiners love it", "No, it's for your brain, not your answer sheet"],
    answer: 1,
    explain: "Everyday examples help you understand. In the exam, write the textbook definition.",
  },
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Player({ course, lessonN }) {
  const video = useRef(null);
  const wrap = useRef(null);
  const hideTimer = useRef(null);
  const lesson = course.lessons.find((l) => l.n === lessonN) ?? course.lessons.find((l) => l.current) ?? course.lessons[0];
  const nextLesson = course.lessons.find((l) => l.n === lesson.n + 1);

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [showUi, setShowUi] = useState(true);
  const [question, setQuestion] = useState(null);
  const [picked, setPicked] = useState(null);
  const [answered, setAnswered] = useState([]);
  const [xp, setXp] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [ended, setEnded] = useState(false);

  const poke = useCallback(() => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUi(false), 2800);
  }, []);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v || question) return;
    if (v.paused) v.play(); else v.pause();
  }, [question]);

  const seek = (s) => {
    const v = video.current;
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, s));
  };

  // Metadata can load before hydration, so read the duration once mounted too.
  useEffect(() => {
    const v = video.current;
    if (v?.duration) setDur(v.duration);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "ArrowRight") seek((video.current?.currentTime ?? 0) + 10);
      if (e.code === "ArrowLeft") seek((video.current?.currentTime ?? 0) - 10);
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, poke]);

  const onTime = () => {
    const v = video.current;
    setT(v.currentTime);
    const cp = CHECKPOINTS.find((c) => v.currentTime >= c.at && v.currentTime < c.at + 1 && !answered.includes(c.at));
    if (cp) {
      v.pause();
      setQuestion(cp);
      setPicked(null);
      setShowUi(true);
    }
  };

  const pick = (i) => {
    setPicked(i);
    if (i === question.answer) setXp((x) => x + 10);
  };

  const resume = () => {
    setAnswered((a) => [...a, question.at]);
    setQuestion(null);
    video.current?.play();
  };

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrap.current?.requestFullscreen?.();
  };

  return (
    <div ref={wrap} onMouseMove={poke} className={`fixed inset-0 z-[60] bg-black text-white ${showUi || !playing ? "" : "cursor-none"}`}>
      <video
        ref={video}
        src={VIDEO}
        poster={POSTER}
        playsInline
        preload="auto"
        onClick={toggle}
        onPlay={() => { setPlaying(true); setEnded(false); poke(); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTime}
        onDurationChange={(e) => setDur(e.currentTarget.duration)}
        onEnded={() => setEnded(true)}
        className="h-full w-full object-contain"
      />

      {/* Top bar */}
      <div className={`absolute inset-x-0 top-0 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 sm:p-6 ${showUi || !playing ? "opacity-100" : "opacity-0"}`}>
        <Link href={`/title/${course.id}`} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"><ArrowLeft /></Link>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-yellow">{course.title} · Lesson {lesson.n}</div>
          <div className="truncate font-display text-lg font-semibold sm:text-xl">{lesson.title}</div>
        </div>
        {xp > 0 && <span className="ml-auto animate-[pop_.3s_ease-out] rounded-full bg-yellow px-3 py-1.5 text-sm font-bold text-foreground">⚡ +{xp} XP</span>}
      </div>

      {/* Big centre play */}
      {!playing && !question && !ended && (
        <button onClick={toggle} aria-label="Play" className="absolute inset-0 m-auto grid h-24 w-24 place-items-center rounded-full bg-yellow text-foreground shadow-[0_6px_0_#ca8a04] transition hover:scale-105">
          <Play className="h-10 w-10" />
        </button>
      )}

      {/* In-video question */}
      {question && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[pop_.35s_ease-out] rounded-[2rem] bg-white p-6 text-foreground shadow-2xl sm:p-8">
            <span className="chip bg-yellow">⚡ Quick check · +10 XP</span>
            <p className="mt-4 font-display text-xl font-bold leading-snug sm:text-2xl">{question.question}</p>
            <div className="mt-5 space-y-2.5">
              {question.options.map((o, i) => {
                const state =
                  picked === null ? "border-border hover:border-foreground"
                  : i === question.answer ? "border-teal bg-mint/30"
                  : i === picked ? "border-coral bg-pink/20"
                  : "border-border opacity-50";
                return (
                  <button key={o} disabled={picked !== null} onClick={() => pick(i)} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left font-medium transition ${state}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold">{String.fromCharCode(65 + i)}</span>
                    {o}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-5 animate-[fadeup_.3s_ease-out]">
                <p className="text-sm text-muted">
                  <b className="text-foreground">{picked === question.answer ? "🎉 Nailed it!" : "Almost!"}</b> {question.explain}
                </p>
                <button onClick={resume} className="btn-primary mt-4 w-full py-3.5 text-base">Keep watching →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Up next */}
      {ended && nextLesson && (
        <div className="absolute bottom-28 right-4 w-80 animate-[fadeup_.4s_ease-out] overflow-hidden rounded-3xl bg-white text-foreground shadow-2xl sm:right-8">
          <div className="relative aspect-video"><Art course={course} seed={`${course.id}-${nextLesson.n - 1}`} /></div>
          <div className="p-4">
            <div className="text-xs font-semibold uppercase text-muted">Up next · Lesson {nextLesson.n}</div>
            <div className="font-display font-semibold">{nextLesson.title}</div>
            <Link href={`/watch/${course.id}?l=${nextLesson.n}`} className="btn-yellow mt-3 w-full">Play next</Link>
          </div>
        </div>
      )}

      {/* Lessons drawer */}
      {drawer && (
        <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white p-5 text-foreground shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Lessons</h3>
            <button onClick={() => setDrawer(false)} className="btn-ghost py-1.5">Close</button>
          </div>
          {course.lessons.map((l) => (
            <Link key={l.id} href={`/watch/${course.id}?l=${l.n}`} onClick={() => setDrawer(false)} className={`mb-2 flex items-center gap-3 rounded-2xl p-2 ${l.n === lesson.n ? "bg-yellow" : "hover:bg-surface-2"}`}>
              <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-xl"><Art course={course} seed={`${course.id}-${l.n - 1}`} /></div>
              <div className="min-w-0 text-sm">
                <div className="font-semibold leading-snug">{l.n}. {l.title}</div>
                <div className="text-xs text-foreground/60">{l.mins} min {l.done ? "· ✓ watched" : ""}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-5 pt-16 transition-opacity duration-300 sm:px-8 ${showUi || !playing ? "opacity-100" : "opacity-0"}`}>
        <div
          className="group relative h-6 cursor-pointer"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * dur); }}
        >
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/25 transition-all group-hover:h-2.5">
            <div className="h-full rounded-full bg-yellow" style={{ width: dur ? `${(t / dur) * 100}%` : 0 }} />
          </div>
          {dur > 0 && CHECKPOINTS.map((c) => (
            <span key={c.at} title="Quick check" className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black ${answered.includes(c.at) ? "bg-mint" : "bg-white"}`} style={{ left: `${(c.at / dur) * 100}%` }} />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1 sm:gap-3">
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/15">{playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}</button>
          <button onClick={() => seek(t - 10)} aria-label="Back 10 seconds" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/15"><Back10 className="h-6 w-6" /></button>
          <button onClick={() => seek(t + 10)} aria-label="Forward 10 seconds" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/15"><Fwd10 className="h-6 w-6" /></button>
          <button aria-label="Volume" className="hidden h-11 w-11 place-items-center rounded-full hover:bg-white/15 sm:grid"><Volume className="h-6 w-6" /></button>
          <span className="ml-1 text-sm tabular-nums text-white/80">{fmt(t)} / {fmt(dur)}</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {nextLesson && <Link href={`/watch/${course.id}?l=${nextLesson.n}`} aria-label="Next lesson" className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm hover:bg-white/15 sm:flex"><SkipNext className="h-5 w-5" /> Next</Link>}
            <button onClick={() => setDrawer(true)} aria-label="Lessons" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/15"><List className="h-6 w-6" /></button>
            <button aria-label="Captions" className="hidden h-11 w-11 place-items-center rounded-full hover:bg-white/15 sm:grid"><Captions className="h-6 w-6" /></button>
            <button onClick={fullscreen} aria-label="Full screen" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/15"><Expand className="h-6 w-6" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
