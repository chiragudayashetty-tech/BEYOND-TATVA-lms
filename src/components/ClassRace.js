"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, GraduationCap, PlayCircle, Timer, Trophy, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SECTIONS } from "@/lib/sections";

// School class race: which classes lead. Names only, never numbers. Renders nothing when no race is on.
const PLACES = [
  { label: "1st", car: "bg-amber-300 text-amber-950", lane: "from-amber-300/40" },
  { label: "2nd", car: "bg-slate-200 text-slate-900", lane: "from-slate-200/30" },
  { label: "3rd", car: "bg-orange-400 text-orange-950", lane: "from-orange-400/30" },
];
const LANE_WIDTH = ["w-full", "w-[78%]", "w-[60%]"];

function left(ms) {
  if (ms <= 0) return "Finished";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `${d}d ${h}h ${mm}m` : `${h}h ${String(mm).padStart(2, "0")}m`;
}

function Track({ icon: Icon, title, leaders, mine, ended }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/15">
      <p className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4" /> {title}</p>
      {leaders.length ? (
        <ol className="mt-3 space-y-2">
          {leaders.map((name, i) => {
            const you = mine && name === mine;
            return (
              <li key={name} className={`${LANE_WIDTH[i]} motion-safe:animate-[race-in_.6s_ease-out_both]`} style={{ animationDelay: `${i * 120}ms` }}>
                <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${PLACES[i].lane} to-transparent p-1 pr-3 ${you ? "ring-2 ring-white" : ""}`}>
                  <span className={`grid h-8 min-w-11 place-items-center rounded-full px-2 text-xs font-black ${PLACES[i].car}`}>{PLACES[i].label}</span>
                  <span className="truncate font-bold">{name}</span>
                  {i === 0 && <Trophy className="ml-auto h-4 w-4 shrink-0 text-amber-300" aria-label={ended ? "Winner" : "Leading"} />}
                  {you && <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-fuchsia-700">You</span>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className="mt-3 text-sm text-white/80">No class on the board yet. Be the first!</p>}
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
  const leadingAny = mine && (watched[0] === mine || enrolled[0] === mine);

  return (
    <section aria-label="Class race" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-violet-600 to-sky-500 p-4 text-white shadow-lg sm:p-5">
      <div aria-hidden className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,#fff_0_10px,#111_10px_20px)] opacity-80" />
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-2xl" />

      <div className="relative mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/80"><Flag className="h-3.5 w-3.5" /> {race.school ?? "Your school"}</p>
          <h2 className="mt-0.5 text-xl font-black sm:text-2xl">{race.ended ? "Class race: final result" : "Class race is ON!"}</h2>
          {mine && <p className="mt-1 text-sm text-white/90">You race for <b>{mine}</b>{leadingAny && !race.ended ? ". Your class is leading! Keep going 🔥" : race.ended ? "." : ". Watch Module 0 to push your class up!"}</p>}
        </div>
        {!race.ended && (
          <div className="rounded-2xl bg-black/25 px-3 py-2 text-right ring-1 ring-white/20">
            <p className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/80"><Timer className="h-3.5 w-3.5" /> Ends in</p>
            <p className="font-mono text-lg font-black tabular-nums">{left(new Date(race.ends_at).getTime() - now)}</p>
          </div>
        )}
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
        <Track icon={PlayCircle} title="Most Module 0 watched" leaders={watched} mine={mine} ended={race.ended} />
        <Track icon={GraduationCap} title="Most enrolled" leaders={enrolled} mine={mine} ended={race.ended} />
      </div>

      {race.student && !race.ended && (
        <label className="relative mt-4 flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 shrink-0 text-amber-300" />
          <span className="shrink-0 font-medium">Your section</span>
          <select className="input max-w-40 text-fg" value={race.section ?? ""} onChange={pick}>
            <option value="">No section</option>
            {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}
