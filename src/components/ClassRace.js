"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap, PlayCircle, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SECTIONS } from "@/lib/sections";

// School competition: which class leads. Names only, never numbers. Renders nothing when no race is on.
export default function ClassRace() {
  const [race, setRace] = useState(null);
  const load = useCallback(() => createClient().rpc("school_race").then(({ data, error }) => { if (!error) setRace(data); }).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => clearInterval(t);
  }, [load]);
  if (!race) return null;

  const ends = new Date(race.ends_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  async function pick(e) {
    await createClient().rpc("set_my_section", { p_section: e.target.value });
    load();
  }
  const cards = [
    [PlayCircle, "Most Module 0 watched", race.watched],
    [GraduationCap, "Most enrolled", race.enrolled],
  ];
  return (
    <section aria-label="Class competition" className="card border-primary/30 bg-primary-soft/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-primary" /> {race.ended ? "Class competition: final result" : "48-hour class competition"}</h2>
        {!race.ended && <span className="text-xs text-muted">Ends {ends}</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {cards.map(([Icon, title, leader]) => (
          <div key={title} className="rounded-2xl border border-border bg-surface p-3">
            <Icon className="h-4 w-4 text-primary" />
            <p className="mt-1 text-xs text-muted">{title}</p>
            <p className="text-lg font-semibold">{leader ?? "No leader yet"}</p>
            {leader && <p className="text-xs text-primary">{race.ended ? "Winner" : "Leading now"}</p>}
          </div>
        ))}
      </div>
      {race.student && !race.ended && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <span className="shrink-0 text-muted">Your section</span>
          <select className="input" value={race.section ?? ""} onChange={pick}>
            <option value="">No section</option>
            {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}
