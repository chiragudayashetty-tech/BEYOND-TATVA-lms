"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, PlayCircle, Search, SearchX } from "lucide-react";
import { Empty } from "@/components/ui";
import { course } from "@/lib/catalog";

const topics = ["Study", "Exam", "ChatGPT", "Prompt", "Poster", "Chatbot"];

// Searches lesson and module titles within the course.
export default function SearchClient({ initial = "" }) {
  const [q, setQ] = useState(initial);
  const term = q.trim().toLowerCase();
  const rows = course.lessons.map((l) => ({ ...l, m: course.modules.find((m) => m.n === l.module) }));
  const results = term ? rows.filter((l) => `${l.title} ${l.m.title} ${l.m.blurb}`.toLowerCase().includes(term)) : rows;
  const now = Date.now();

  return (
    <div>
      <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        <Search className="h-5 w-5 text-subtle" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons and modules" className="w-full bg-transparent py-3.5 outline-none placeholder:text-subtle" />
      </label>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {topics.map((t) => (
          <button key={t} onClick={() => setQ(q === t ? "" : t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${q === t ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-fg"}`}>
            {t}
          </button>
        ))}
      </div>
      <h2 className="mb-3 mt-6 text-sm font-medium text-muted">{term ? `${results.length} lesson${results.length === 1 ? "" : "s"} for "${q}"` : "All lessons"}</h2>
      {results.length ? (
        <ul className="card divide-y divide-border overflow-hidden">
          {results.map((l) => {
            const out = new Date(l.m.release).getTime() <= now;
            return (
              <li key={l.id}>
                <Link href={out ? `/watch/${course.id}?l=${l.n}` : `/course#m${l.m.n}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                  {out ? <PlayCircle className="h-5 w-5 text-primary" /> : <CalendarClock className="h-5 w-5 text-subtle" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.title}</div>
                    <div className="text-xs text-muted">Module {l.m.n}: {l.m.title}</div>
                  </div>
                  <span className="text-xs text-muted">{l.mins} min</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty icon={SearchX} title="No matches" body="Try a word like exam or prompt." />
      )}
    </div>
  );
}
