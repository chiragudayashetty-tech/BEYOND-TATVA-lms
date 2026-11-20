"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import FactLoader from "@/components/FactLoader";

// Code that moves to another page with router.push/replace calls this, so the loader shows there too.
export function startNavLoader() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("bt:navigate"));
}

// Glowing bar at the very top that starts the moment any internal link is tapped and finishes when the
// new page is on screen, so navigation never looks stuck (even when the page has no loading.js).
export default function TopLoader() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);
  const slowTimer = useRef(null);
  // If the new page hasn't appeared after 400 ms (not prefetched yet, slow network), show the centred
  // loader with facts, so a slow tap never looks like nothing is happening.
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    function start(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      begin();
    }
    function begin() {
      clearInterval(timer.current);
      clearTimeout(slowTimer.current);
      slowTimer.current = setTimeout(() => { setSlow(true); slowTimer.current = setTimeout(() => setSlow(false), 15000); }, 400); // never stuck for good
      setVisible(true);
      setWidth(8);
      // Creeps towards 90% and slows down, like a real progress bar.
      timer.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.08 : w)), 200);
    }
    document.addEventListener("click", start, true);
    window.addEventListener("bt:navigate", begin);
    return () => {
      document.removeEventListener("click", start, true); window.removeEventListener("bt:navigate", begin);
      clearInterval(timer.current); clearTimeout(slowTimer.current);
    };
  }, []);

  useEffect(() => {
    clearInterval(timer.current);
    clearTimeout(slowTimer.current);
    const done = setTimeout(() => setSlow(false), 0);
    const finish = setTimeout(() => setWidth((w) => (w ? 100 : 0)), 0);
    const hide = setTimeout(() => { setVisible(false); setWidth(0); }, 350);
    return () => { clearTimeout(done); clearTimeout(finish); clearTimeout(hide); };
  }, [pathname]);

  return <>{slow && <FactLoader label="page" />}<div aria-hidden="true" className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
    <div className="bt-bar h-full rounded-r-full transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
  </div></>;
}
