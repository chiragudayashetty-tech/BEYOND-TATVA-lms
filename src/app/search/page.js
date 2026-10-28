"use client";

import { useState } from "react";
import StudentFrame from "@/components/ott/StudentFrame";
import { CourseCard } from "@/components/ott/Cards";
import { Search } from "@/components/ott/Icons";
import { courses } from "@/lib/catalog";

const topics = ["Study skills", "Exam prep", "ChatGPT", "Design", "Projects", "Ethics", "Science", "Data"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const results = term
    ? courses.filter((c) =>
        [c.title, c.tagline, c.description, ...c.tags, ...c.lessons.map((l) => l.title)].join(" ").toLowerCase().includes(term))
    : courses;

  return (
    <StudentFrame>
      <div className="px-4 pt-6 sm:px-8 lg:px-12">
        <label className="flex items-center gap-3 rounded-full border-2 border-foreground bg-surface px-5 py-3.5 shadow-[0_4px_0_#0f172a]">
          <Search className="h-6 w-6 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses, lessons, topics"
            className="w-full bg-transparent text-lg outline-none placeholder:text-muted"
          />
        </label>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
          {topics.map((t) => (
            <button key={t} onClick={() => setQ(t)} className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${q === t ? "border-foreground bg-foreground text-white" : "border-border bg-surface hover:border-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <h2 className="mb-4 mt-6 font-display text-xl font-bold">{term ? `${results.length} results for "${q}"` : "Browse everything"}</h2>
        {results.length ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>a]:w-full">
            {results.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        ) : (
          <div className="rounded-3xl bg-surface-2 p-10 text-center">
            <div className="text-4xl">🔍</div>
            <p className="mt-2 font-display font-semibold">Nothing yet for that</p>
            <p className="text-sm text-muted">Try a topic like &quot;exam&quot; or &quot;ChatGPT&quot;.</p>
          </div>
        )}
      </div>
    </StudentFrame>
  );
}
