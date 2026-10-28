"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { Bell, Grid, Home, Bookmark, Live, Search } from "./Icons";

export const studentLinks = [
  { href: "/browse", label: "Home", icon: Home },
  { href: "/courses", label: "Courses", icon: Grid },
  { href: "/live", label: "Live", icon: Live },
  { href: "/my-list", label: "My List", icon: Bookmark },
];

export default function TopNav() {
  const pathname = usePathname();
  const [raised, setRaised] = useState(false);

  useEffect(() => {
    const onScroll = () => setRaised(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-background/90 backdrop-blur transition-shadow ${raised ? "shadow-[0_2px_0_#e2e8f0]" : ""}`}>
      <div className="flex items-center justify-between gap-6 px-4 py-3 sm:px-8 lg:px-12">
        <div className="flex items-center gap-8">
          <Logo href="/browse" />
          <nav className="hidden gap-1 rounded-full bg-surface-2 p-1 font-ui text-sm font-medium md:flex">
            {studentLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 transition ${pathname === l.href ? "bg-foreground text-white" : "text-muted hover:text-foreground"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/search" aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2"><Search /></Link>
          <button aria-label="Notifications" className="relative hidden h-10 w-10 place-items-center rounded-full hover:bg-surface-2 sm:grid">
            <Bell />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-coral ring-2 ring-background" />
          </button>
          <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-yellow px-3 py-1.5 text-xs font-bold">🔥 5</span>
          <span className="hidden items-center gap-1 whitespace-nowrap rounded-full bg-lilac/30 px-3 py-1.5 text-xs font-bold text-brand lg:flex">⚡ 1,240 XP</span>
          <Link href="/profiles" aria-label="Switch profile" className="grid h-10 w-10 place-items-center rounded-full bg-sky font-display font-bold ring-2 ring-white">
            A
          </Link>
        </div>
      </div>
    </header>
  );
}
