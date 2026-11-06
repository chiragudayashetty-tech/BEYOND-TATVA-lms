"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Glowing bar at the very top that starts the moment any internal link is tapped and finishes when the
// new page is on screen, so navigation never looks stuck (even when the page has no loading.js).
export default function TopLoader() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    function start(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      clearInterval(timer.current);
      setVisible(true);
      setWidth(8);
      // Creeps towards 90% and slows down, like a real progress bar.
      timer.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.08 : w)), 200);
    }
    document.addEventListener("click", start, true);
    return () => { document.removeEventListener("click", start, true); clearInterval(timer.current); };
  }, []);

  useEffect(() => {
    clearInterval(timer.current);
    const finish = setTimeout(() => setWidth((w) => (w ? 100 : 0)), 0);
    const hide = setTimeout(() => { setVisible(false); setWidth(0); }, 350);
    return () => { clearTimeout(finish); clearTimeout(hide); };
  }, [pathname]);

  return <div aria-hidden="true" className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
    <div className="bt-bar h-full rounded-r-full transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
  </div>;
}
