"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "./Icons";

// Horizontal shelf: arrow buttons on desktop, swipe on phones.
export default function Row({ title, subtitle, emoji, children }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="mb-4 sm:mb-6">
      <div className="flex items-end justify-between gap-3 px-4 sm:px-8 lg:px-12">
        <div>
          <h2 className="font-display text-xl font-bold sm:text-2xl">
            {emoji && <span className="mr-2">{emoji}</span>}
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="grid h-9 w-9 place-items-center rounded-full border-2 border-border bg-surface transition hover:border-foreground"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="grid h-9 w-9 place-items-center rounded-full border-2 border-border bg-surface transition hover:border-foreground"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-6 pt-4 sm:gap-4 sm:scroll-px-8 sm:px-8 lg:scroll-px-12 lg:px-12">
        {children}
      </div>
    </section>
  );
}
