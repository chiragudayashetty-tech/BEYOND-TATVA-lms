"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

// The theme lives on <html class="dark"> (set before first paint in layout.js); watch it there.
const watchTheme = (cb) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};
const isDark = () => document.documentElement.classList.contains("dark");

export function useTheme() {
  const dark = useSyncExternalStore(watchTheme, isDark, () => false);
  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };
  return [dark, toggle];
}

export default function ThemeToggle({ className = "" }) {
  const [dark, toggle] = useTheme();
  return (
    <button onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:text-fg ${className}`}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

// Labelled switch for settings pages.
export function ThemeSwitch() {
  const [dark, toggle] = useTheme();
  return (
    <button role="switch" aria-checked={dark} onClick={toggle}
      className={`relative h-6 w-11 rounded-full transition ${dark ? "bg-primary" : "bg-border"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
