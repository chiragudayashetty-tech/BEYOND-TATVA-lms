"use client";

import { useEffect, useRef, useState } from "react";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Animated price: counts down from the original price, strikes it out, then pops the "Save %" badge.
// Starts when it scrolls into view; shows the final state at once for reduced motion.
export default function PriceTag({ price, listPrice, className = "" }) {
  const list = listPrice && listPrice > price ? listPrice : null;
  const ref = useRef(null);
  const [shown, setShown] = useState(list ?? price);
  const [done, setDone] = useState(!list);

  useEffect(() => {
    if (!list) return;
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(price); setDone(true); return; }
      const t0 = performance.now(), dur = 1100;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
        setShown(list - (list - price) * ease);
        if (k < 1) raf = requestAnimationFrame(tick); else setDone(true);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [price, list]);

  return (
    <div ref={ref} className={`bt-price ${done ? "is-done" : ""} ${className}`}>
      <b className="bt-price-now tabular-nums">{inr(shown)}</b>
      {list && <s className="bt-price-was">{inr(list)}</s>}
      {list && <span className="bt-price-save">Save {Math.round(((list - price) / list) * 100)}%</span>}
    </div>
  );
}
