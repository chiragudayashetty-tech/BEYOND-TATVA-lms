"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SECTIONS } from "@/lib/sections";

// School class race: which classes lead. Names only, never numbers. Renders nothing when no race is on.
// Positions on the track show rank only (1st nearest the finish), not how many students.
const POS = ["92%", "70%", "50%"];

function parts(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return [["d", Math.floor(m / 1440)], ["h", Math.floor((m % 1440) / 60)], ["m", m % 60]];
}

function Board({ title, leaders, mine, ended }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{title}</p>
      {leaders.length ? (
        <ol className="mt-3 space-y-3">
          {leaders.map((name, i) => {
            const you = mine && name === mine;
            const lead = i === 0;
            return (
              <li key={name}>
                <div className="flex items-baseline gap-3">
                  <span className={`w-6 text-sm tabular-nums ${lead ? "font-semibold text-primary" : "text-subtle"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`flex-1 truncate ${lead ? "text-base font-semibold" : "text-sm"}`}>{name}</span>
                  {you && <span className="text-[11px] font-medium uppercase tracking-wider text-primary">Your class</span>}
                  {lead && !you && <span className="text-[11px] uppercase tracking-wider text-muted">{ended ? "Winner" : "Leading"}</span>}
                </div>
                <div className="relative ml-9 mt-1.5 h-px bg-border" aria-hidden>
                  <span className="absolute right-0 top-1/2 h-2.5 w-px -translate-y-1/2 bg-fg/40" />
                  <span className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:transition-[left] motion-safe:duration-700 ${lead ? "bg-primary ring-4 ring-primary/15" : you ? "bg-primary/70" : "bg-fg/30"}`} style={{ left: POS[i] }} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className="mt-3 text-sm text-muted">No class on the board yet.</p>}
    </div>
  );
}

export default function ClassRace() {
  const [race, setRace] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const load = useCallback(() => createClient().rpc("school_race").then(({ data, error }) => { if (!error) setRace(data); }).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    const c = setInterval(() => setNow(Date.now()), 30_000);
    return () => { clearInterval(t); clearInterval(c); };
  }, [load]);
  if (!race) return null;

  async function pick(e) {
    await createClient().rpc("set_my_section", { p_section: e.target.value });
    load();
  }
  const watched = race.watched_top ?? (race.watched ? [race.watched] : []);
  const enrolled = race.enrolled_top ?? (race.enrolled ? [race.enrolled] : []);
  const mine = race.my_class;
  const leading = mine && (watched[0] === mine || enrolled[0] === mine);
  const line = !mine ? null
    : race.ended ? <>You raced for <span className="font-medium text-fg">{mine}</span>.</>
    : leading ? <><span className="font-medium text-fg">{mine}</span> is in the lead. Keep it there.</>
    : <>You race for <span className="font-medium text-fg">{mine}</span>. Finish Module 0 to move your class up.</>;

  return (
    <section aria-label="Class race" className="card overflow-hidden p-0">
      <div className="h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" aria-hidden />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {!race.ended && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" /></span>}
              {race.ended ? "Final result" : "Class race · Live"}
            </p>
            <h2 className="mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl">{race.school ?? "Your school"}</h2>
            {line && <p className="mt-1 text-sm text-muted">{line}</p>}
          </div>
          {!race.ended && (
            <div className="flex items-end gap-3" aria-label="Time left">
              {parts(new Date(race.ends_at).getTime() - now).map(([u, v]) => (
                <div key={u} className="text-center">
                  <p className="text-2xl font-light tabular-nums leading-none">{String(v).padStart(2, "0")}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-subtle">{u === "d" ? "days" : u === "h" ? "hrs" : "min"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 border-t border-border pt-5 sm:grid-cols-2 sm:gap-8">
          <Board title="Module 0 watched" leaders={watched} mine={mine} ended={race.ended} />
          <Board title="Enrolled" leaders={enrolled} mine={mine} ended={race.ended} />
        </div>

        {race.student && !race.ended && (
          <label className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            <span className="text-muted">Your section</span>
            <select className="input max-w-32" value={race.section ?? ""} onChange={pick}>
              <option value="">None</option>
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>
    </section>
  );
}
