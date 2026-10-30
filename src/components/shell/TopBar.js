"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Flame, LogOut, Search, Settings, User } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar } from "@/components/ui";
import { notifications } from "@/lib/demo";

function useOutside(ref, close) {
  useEffect(() => {
    const h = (e) => !ref.current?.contains(e.target) && close();
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [ref, close]);
}

export default function TopBar({ name, role, greeting, streak }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(null);
  const ref = useRef(null);
  useOutside(ref, () => setMenu(null));
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1 lg:flex-none">
          {greeting && (
            <>
              <p className="text-xs text-muted">{greeting.top}</p>
              <p className="truncate font-display text-lg font-semibold leading-tight">{greeting.name}</p>
            </>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q)}`); }}
          className="ml-auto hidden w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-surface px-3 md:flex"
        >
          <Search className="h-4 w-4 text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, lessons, topics" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-subtle" />
          <kbd className="hidden rounded-md border border-border px-1.5 text-[10px] text-subtle xl:block">/</kbd>
        </form>

        <div ref={ref} className="flex items-center gap-2">
          <Link href="/search" aria-label="Search" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted md:hidden"><Search className="h-[18px] w-[18px]" /></Link>
          {streak != null && (
            <span className="hidden h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold sm:flex" title="Day streak">
              <Flame className="h-4 w-4 text-warning" /> {streak}
            </span>
          )}
          <ThemeToggle />
          <div className="relative">
            <button onClick={() => setMenu(menu === "bell" ? null : "bell")} aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted hover:text-fg">
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread}</span>}
            </button>
            {menu === "bell" && (
              <div className="absolute right-0 top-12 w-80 animate-[pop_.15s_ease-out] rounded-2xl border border-border bg-surface p-2 shadow-xl">
                <div className="px-3 py-2 text-sm font-semibold">Notifications</div>
                {notifications.map((n) => (
                  <div key={n.title} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.unread ? "bg-primary" : "bg-transparent"}`} />
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-muted">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setMenu(menu === "me" ? null : "me")} aria-label="Account" className="rounded-full ring-offset-2 ring-offset-bg focus-visible:ring-2 focus-visible:ring-primary">
              <Avatar name={name} size="h-10 w-10 text-sm" />
            </button>
            {menu === "me" && (
              <div className="absolute right-0 top-12 w-60 animate-[pop_.15s_ease-out] rounded-2xl border border-border bg-surface p-2 shadow-xl">
                <div className="px-3 py-2">
                  <div className="truncate font-semibold">{name}</div>
                  <div className="text-xs capitalize text-muted">{role}</div>
                </div>
                <Link href="/profile" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><User className="h-4 w-4 text-muted" /> Profile</Link>
                <Link href="/profile#settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><Settings className="h-4 w-4 text-muted" /> Settings</Link>
                <form action="/auth/signout" method="post">
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger-soft"><LogOut className="h-4 w-4" /> Log out</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
