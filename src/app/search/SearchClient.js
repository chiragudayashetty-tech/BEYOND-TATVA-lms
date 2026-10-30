"use client";

import { useState } from "react";
import { Search, SearchX } from "lucide-react";
import { CourseCard } from "@/components/course";
import { Empty } from "@/components/ui";
import { courses } from "@/lib/catalog";

const topics = ["Study skills", "Exam prep", "Prompting", "Design", "Project", "Ethics", "Science", "Data"];

export default function SearchClient({ initial = "" }) {
  const [q, setQ] = useState(initial);
  const term = q.trim().toLowerCase();
  const results = term
    ? courses.filter((c) => [c.title, c.tagline, c.description, ...c.tags, ...c.lessons.map((l) => l.title)].join(" ").toLowerCase().includes(term))
    : courses;

  return (
    <div>
      <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        <Search className="h-5 w-5 text-subtle" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, lessons, topics" className="w-full bg-transparent py-3.5 outline-none placeholder:text-subtle" />
      </label>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {topics.map((t) => (
          <button key={t} onClick={() => setQ(q === t ? "" : t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${q === t ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-fg"}`}>
            {t}
          </button>
        ))}
      </div>
      <h2 className="mb-4 mt-6 text-sm font-medium text-muted">{term ? `${results.length} result${results.length === 1 ? "" : "s"} for "${q}"` : "All courses"}</h2>
      {results.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      ) : (
        <Empty icon={SearchX} title="No matches" body="Try a topic like exam or prompting." />
      )}
    </div>
  );
}
