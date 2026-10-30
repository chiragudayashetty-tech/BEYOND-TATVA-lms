"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Plus, Radio, RotateCcw, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";

const kindStyle = {
  Lesson: { tone: "primary", icon: BookOpen },
  Live: { tone: "success", icon: Radio },
  Practice: { tone: "warning", icon: Target },
  Revision: { tone: "neutral", icon: RotateCcw },
};

const MONTH = "October 2026";
const FIRST_WEEKDAY = 3; // 1 Oct 2026 is a Thursday (Mon-first grid)
const DAYS_IN_MONTH = 31;
const EVENTS = { 30: ["Live", "Lesson"], 31: ["Practice"], 24: ["Live"], 21: ["Lesson"], 17: ["Live"], 28: ["Lesson", "Revision"] };

export default function PlannerView({ days, initial }) {
  const [selected, setSelected] = useState(days.find((d) => d.today)?.n);
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", time: "8:00 PM", kind: "Revision" });

  useEffect(() => {
    try { const s = localStorage.getItem("planner"); if (s) setItems(JSON.parse(s)); } catch {}
  }, []);
  const save = (next) => { setItems(next); try { localStorage.setItem("planner", JSON.stringify(next)); } catch {} };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">This week</span>
            <div className="flex gap-1">
              <button aria-label="Previous week" className="btn-ghost h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></button>
              <button aria-label="Next week" className="btn-ghost h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => (
              <button key={d.n} onClick={() => setSelected(d.n)}
                className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-sm transition ${selected === d.n ? "bg-primary text-primary-fg" : "hover:bg-surface-2"}`}>
                <span className={`text-[11px] uppercase ${selected === d.n ? "text-primary-fg/80" : "text-subtle"}`}>{d.d}</span>
                <span className="font-semibold">{d.n}</span>
                <span className={`h-1 w-1 rounded-full ${EVENTS[d.n] ? (selected === d.n ? "bg-primary-fg" : "bg-primary") : "bg-transparent"}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Today&apos;s plan</h2>
              <p className="text-sm text-muted">{done} of {items.length} done</p>
            </div>
            <button onClick={() => setAdding(!adding)} className="btn-primary"><Plus className="h-4 w-4" /> Add block</button>
          </div>

          {adding && (
            <form onSubmit={(e) => { e.preventDefault(); if (!draft.title.trim()) return; save([...items, { ...draft, end: "", title: draft.title.trim() }]); setDraft({ ...draft, title: "" }); setAdding(false); }}
              className="mb-4 grid gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:grid-cols-[1fr_120px_130px_auto]">
              <input autoFocus className="input" placeholder="What will you study?" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <input className="input" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} aria-label="Time" />
              <select className="input" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} aria-label="Type">
                {Object.keys(kindStyle).map((k) => <option key={k}>{k}</option>)}
              </select>
              <button className="btn-primary">Save</button>
            </form>
          )}

          <ul className="space-y-2">
            {items.map((it, i) => {
              const k = kindStyle[it.kind] ?? kindStyle.Revision;
              const Icon = k.icon;
              return (
                <li key={`${it.title}-${i}`} className={`group flex items-center gap-3 rounded-xl border border-border p-3 transition ${it.done ? "opacity-60" : ""}`}>
                  <button onClick={() => save(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} aria-label={it.done ? "Mark not done" : "Mark done"}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${it.done ? "border-success bg-success text-white" : "border-border hover:border-primary"}`}>
                    {it.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                  <div className="w-20 shrink-0 text-sm">
                    <div className="font-semibold">{it.time}</div>
                    {it.end && <div className="text-xs text-muted">{it.end}</div>}
                  </div>
                  <div className={`min-w-0 flex-1 text-sm font-medium ${it.done ? "line-through" : ""}`}>{it.title}</div>
                  <Badge tone={k.tone}><Icon className="h-3 w-3" /> {it.kind}</Badge>
                  <button onClick={() => save(items.filter((_, j) => j !== i))} aria-label="Remove" className="btn-ghost h-8 w-8 p-0 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="card h-fit p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{MONTH}</h2>
          <div className="flex gap-1">
            <button aria-label="Previous month" className="btn-ghost h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></button>
            <button aria-label="Next month" className="btn-ghost h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="py-1 font-medium text-subtle">{d}</span>)}
          {Array.from({ length: FIRST_WEEKDAY }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setSelected(n)}
              className={`relative grid aspect-square place-items-center rounded-lg text-sm transition ${n === selected ? "bg-primary font-semibold text-primary-fg" : n === 30 ? "font-semibold text-primary ring-1 ring-primary" : "hover:bg-surface-2"}`}>
              {n}
              {EVENTS[n] && n !== selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 text-sm font-semibold">Coming up</div>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-success" /><div><div className="font-medium">Live: AI careers AMA</div><div className="text-xs text-muted">Today, 5:00 PM</div></div></li>
            <li className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-danger" /><div><div className="font-medium">Assignment: Summarise a chapter</div><div className="text-xs text-muted">Sat 1 Nov, 11:59 PM</div></div></li>
            <li className="flex gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-primary" /><div><div className="font-medium">Level 2 quiz: AI Study Hacks</div><div className="text-xs text-muted">Mon 3 Nov</div></div></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
