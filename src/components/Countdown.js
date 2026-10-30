"use client";

import { useEffect, useState } from "react";

const parts = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
};

// Ticking countdown to a premiere. `compact` renders inline text like "2d 4h 10m".
export default function Countdown({ to, compact = false, onDone }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (now != null && now >= target) onDone?.();
  }, [now, target, onDone]);

  if (now == null) return <span className="tabular-nums opacity-0">0d 0h 0m</span>;
  const [d, h, m, s] = parts(target - now);
  if (target <= now) return <span>Premiered</span>;

  if (compact) return <span className="tabular-nums">{d > 0 ? `${d}d ` : ""}{h}h {m}m</span>;
  return (
    <div className="flex gap-2">
      {[[d, "days"], [h, "hours"], [m, "mins"], [s, "secs"]].map(([v, l]) => (
        <div key={l} className="min-w-14 rounded-xl bg-white/10 px-2 py-2 text-center ring-1 ring-inset ring-white/15">
          <div className="font-display text-2xl font-semibold tabular-nums">{String(v).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-70">{l}</div>
        </div>
      ))}
    </div>
  );
}
