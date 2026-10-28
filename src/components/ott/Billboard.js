"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Art, { frameFor } from "./Art";
import { ListToggle } from "./Cards";
import { Info, Play } from "./Icons";

// Rotating hero card for featured courses.
export default function Billboard({ items }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % items.length), 7000);
    return () => clearInterval(id);
  }, [items.length]);

  const c = items[i];
  const resume = c.progress > 0 && c.progress < 100;

  return (
    <section className="px-4 pt-4 sm:px-8 lg:px-12">
      <div className="relative min-h-[460px] overflow-hidden rounded-[2rem] sm:min-h-[480px] lg:min-h-[540px]">
        {items.map((it, n) => (
          <div key={it.id} className={`absolute inset-0 transition-opacity duration-1000 ${n === i ? "opacity-100" : "opacity-0"}`}>
            {it.hero ? (
              <video
                src={it.hero}
                poster={frameFor(it, "hero")}
                autoPlay
                muted
                loop
                playsInline
                preload={n === 0 ? "auto" : "metadata"}
                className="h-full w-full object-cover"
              />
            ) : (
              <Art course={it} seed="hero" className={n === i ? "animate-[kenburns_14s_ease-out_both]" : ""} />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/25 to-transparent" />

        <div key={c.id} className="relative flex min-h-[460px] animate-[fadeup_.6s_ease-out_both] flex-col justify-end p-6 text-white sm:min-h-[480px] sm:p-10 lg:min-h-[540px] lg:p-14">
          <span className="w-fit rounded-full bg-yellow px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-foreground">
            {c.isNew ? "✨ New course" : resume ? "▶ Keep going" : "⭐ Featured"}
          </span>
          <h1 className="mt-4 max-w-2xl font-display text-5xl font-extrabold leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">{c.title}</h1>
          <p className="mt-3 font-ui text-xl font-medium sm:text-2xl">{c.tagline}</p>
          <p className="mt-3 hidden max-w-lg text-white/85 sm:block">{c.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{c.grade}</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{c.lessonCount} lessons</span>
            <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{Math.round(c.mins / 6) / 10} hours</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Link href={`/watch/${c.id}`} className="btn-yellow px-7 py-3.5 text-base">
              <Play className="h-5 w-5" /> {resume ? `Resume · ${c.progress}%` : "Start learning"}
            </Link>
            <Link href={`/title/${c.id}`} className="btn border-2 border-white/60 bg-white/20 px-6 py-3 text-base text-white backdrop-blur hover:bg-white/30">
              <Info className="h-5 w-5" /> <span className="hidden sm:inline">Details</span>
            </Link>
            <ListToggle />
          </div>
        </div>

        {items.length > 1 && (
          <div className="absolute bottom-6 right-6 flex gap-1.5 sm:bottom-10 sm:right-10">
            {items.map((it, n) => (
              <button key={it.id} onClick={() => setI(n)} aria-label={`Show ${it.title}`} className={`h-2.5 rounded-full transition-all ${n === i ? "w-8 bg-yellow" : "w-2.5 bg-white/60"}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
