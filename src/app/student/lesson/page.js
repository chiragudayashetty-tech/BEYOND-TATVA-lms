"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { lesson } from "@/lib/mock";
import { studentNav } from "@/lib/nav";

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Simulated player: the real one will stream from Bunny/YouTube and pause the same way at checkpoints.
export default function LessonPage() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [question, setQuestion] = useState(null);
  const [picked, setPicked] = useState(null);
  const [answered, setAnswered] = useState([]);
  const [tab, setTab] = useState("lessons");

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((prev) => {
        const next = Math.min(prev + 1, lesson.duration);
        const cp = lesson.checkpoints.find((c) => c.at === next && !answered.includes(c.at));
        if (cp) { setPlaying(false); setQuestion(cp); setPicked(null); }
        if (next === lesson.duration) setPlaying(false);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, answered]);

  const resume = () => {
    setAnswered((a) => [...a, question.at]);
    setQuestion(null);
    setPlaying(true);
  };

  return (
    <AppShell role="student" name="Ananya" nav={studentNav}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#042f2e]">
            <div className="absolute inset-0 grid place-items-center">
              {!question && (
                <button
                  onClick={() => setPlaying(!playing)}
                  className="grid h-20 w-20 place-items-center rounded-full bg-white/90 text-3xl text-[#0f172a] shadow-2xl transition hover:scale-105"
                >
                  {playing ? "❚❚" : "▶"}
                </button>
              )}
            </div>

            {question && (
              <div className="absolute inset-0 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
                  <span className="chip bg-teal/15 text-teal">⚡ Quick check</span>
                  <p className="mt-3 font-semibold">{question.question}</p>
                  <div className="mt-4 space-y-2">
                    {question.options.map((o, i) => {
                      const state = picked === null ? "" : i === question.answer ? "border-teal bg-teal/15" : i === picked ? "border-coral bg-coral/15" : "opacity-50";
                      return (
                        <button key={o} disabled={picked !== null} onClick={() => setPicked(i)}
                          className={`w-full rounded-xl border border-border p-3 text-left text-sm transition hover:bg-surface-2 ${state}`}>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {picked !== null && (
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm">{picked === question.answer ? "🎉 Nice! +10 XP" : "Not quite. The right answer is highlighted."}</span>
                      <button onClick={resume} className="btn-primary">Keep watching</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="relative h-1.5 rounded-full bg-white/20">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(t / lesson.duration) * 100}%` }} />
                {lesson.checkpoints.map((c) => (
                  <span key={c.at} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-yellow"
                    style={{ left: `${(c.at / lesson.duration) * 100}%` }} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/80">
                <span>{fmt(t)} / {fmt(lesson.duration)}</span>
                <span>HD · 1x · CC</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm text-teal">{lesson.module}</p>
            <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>
            <p className="mt-2 text-muted">
              Learn how to turn a long textbook chapter into a clear summary using AI, and why you must always double-check it.
              Watch for the <span className="text-yellow">yellow dots</span>: those are quick questions.
            </p>
          </div>
        </div>

        <aside className="card h-fit p-0">
          <div className="grid grid-cols-2 border-b border-border font-ui text-sm">
            {["lessons", "resources"].map((k) => (
              <button key={k} onClick={() => setTab(k)}
                className={`py-3 capitalize ${tab === k ? "border-b-2 border-teal text-foreground" : "text-muted"}`}>
                {k}
              </button>
            ))}
          </div>
          {tab === "lessons" ? (
            <ol className="p-2">
              {lesson.chapters.map((c, i) => (
                <li key={c.title} className={`flex items-center gap-3 rounded-xl p-3 text-sm ${c.current ? "bg-brand/20" : ""}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${
                    c.done ? "bg-teal text-[#0f172a]" : c.current ? "bg-brand" : "bg-surface-2 text-muted"}`}>
                    {c.done ? "✓" : c.quiz ? "?" : i + 1}
                  </span>
                  <span className={c.done ? "text-muted" : ""}>{c.title}</span>
                </li>
              ))}
            </ol>
          ) : (
            <ul className="space-y-2 p-3">
              {lesson.resources.map((r) => (
                <li key={r.name} className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
                  <span>📎 {r.name}</span>
                  <span className="chip bg-surface text-muted">{r.type}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
