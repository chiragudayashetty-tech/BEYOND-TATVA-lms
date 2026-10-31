"use client";

import { useMemo, useState } from "react";
import { useIsClient } from "@/lib/hooks";
import { BookOpen, CalendarPlus, Check, ChevronLeft, ChevronRight, Plus, RotateCcw, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";

const kindStyle = {
  Lesson: { tone: "primary", icon: BookOpen },
  Practice: { tone: "warning", icon: Target },
  Revision: { tone: "neutral", icon: RotateCcw },
};

const key = (d) => d.toLocaleDateString("en-CA");
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7)); // Monday

// Study blocks are stored per day on this device. Syncing to the account comes with the planner table.
export default function PlannerView() {
  // Dates and the saved plan come from this device, so render only once in the browser.
  const isClient = useIsClient();
  const [today] = useState(() => new Date());
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [plan, setPlan] = useState(() => {
    try { return typeof window === "undefined" ? {} : JSON.parse(localStorage.getItem("planner:v2") ?? "{}"); } catch { return {}; }
  });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", time: "7:00 PM", kind: "Lesson" });

  const save = (next) => { setPlan(next); try { localStorage.setItem("planner:v2", JSON.stringify(next)); } catch {} };
  const week = useMemo(() => (selected ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selected), i)) : []), [selected]);

  if (!isClient) return <div className="card h-96 animate-pulse" />;

  const dayKey = key(selected);
  const items = plan[dayKey] ?? [];
  const setItems = (next) => save({ ...plan, [dayKey]: next });
  const done = items.filter((i) => i.done).length;
  const isToday = dayKey === key(today);

  const first = new Date(month);
  const lead = (first.getDay() + 6) % 7;
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">{week[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {week[6].toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            <div className="flex gap-1">
              <button onClick={() => setSelected(addDays(selected, -7))} aria-label="Previous week" className="btn-ghost h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setSelected(addDays(selected, 7))} aria-label="Next week" className="btn-ghost h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const k = key(d);
              const on = k === dayKey;
              return (
                <button key={k} onClick={() => setSelected(d)}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-sm transition ${on ? "bg-primary text-primary-fg" : k === key(today) ? "ring-1 ring-primary" : "hover:bg-surface-2"}`}>
                  <span className={`text-[11px] uppercase ${on ? "text-primary-fg/80" : "text-subtle"}`}>{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="font-semibold">{d.getDate()}</span>
                  <span className={`h-1 w-1 rounded-full ${plan[k]?.length ? (on ? "bg-primary-fg" : "bg-primary") : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{isToday ? "Today's plan" : selected.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</h2>
              <p className="text-sm text-muted">{items.length ? `${done} of ${items.length} done` : "Nothing planned yet"}</p>
            </div>
            <button onClick={() => setAdding(!adding)} className="btn-primary"><Plus className="h-4 w-4" /> Add block</button>
          </div>

          {adding && (
            <form onSubmit={(e) => { e.preventDefault(); if (!draft.title.trim()) return; setItems([...items, { ...draft, title: draft.title.trim() }]); setDraft({ ...draft, title: "" }); setAdding(false); }}
              className="mb-4 grid gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:grid-cols-[1fr_120px_130px_auto]">
              <input autoFocus className="input" placeholder="What will you study?" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <input className="input" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} aria-label="Time" />
              <select className="input" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} aria-label="Type">
                {Object.keys(kindStyle).map((k) => <option key={k}>{k}</option>)}
              </select>
              <button className="btn-primary">Save</button>
            </form>
          )}

          {items.length === 0 && !adding ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <CalendarPlus className="h-6 w-6 text-subtle" />
              <p className="mt-2 text-sm text-muted">Add a 15–20 minute block. Small and daily beats long and rare.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((it, i) => {
                const k = kindStyle[it.kind] ?? kindStyle.Revision;
                const Icon = k.icon;
                return (
                  <li key={`${it.title}-${i}`} className={`group flex items-center gap-3 rounded-xl border border-border p-3 transition ${it.done ? "opacity-60" : ""}`}>
                    <button onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} aria-label={it.done ? "Mark not done" : "Mark done"}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition ${it.done ? "border-success bg-success text-white" : "border-border hover:border-primary"}`}>
                      {it.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>
                    <div className="w-20 shrink-0 text-sm font-semibold">{it.time}</div>
                    <div className={`min-w-0 flex-1 text-sm font-medium ${it.done ? "line-through" : ""}`}>{it.title}</div>
                    <Badge tone={k.tone}><Icon className="h-3 w-3" /> {it.kind}</Badge>
                    <button onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove" className="btn-ghost h-8 w-8 p-0 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card h-fit p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
          <div className="flex gap-1">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="btn-ghost h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="btn-ghost h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="py-1 font-medium text-subtle">{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: daysIn }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)).map((d) => {
            const k = key(d);
            return (
              <button key={k} onClick={() => setSelected(d)}
                className={`relative grid aspect-square place-items-center rounded-lg text-sm transition ${k === dayKey ? "bg-primary font-semibold text-primary-fg" : k === key(today) ? "font-semibold text-primary ring-1 ring-primary" : "hover:bg-surface-2"}`}>
                {d.getDate()}
                {plan[k]?.length > 0 && k !== dayKey && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
