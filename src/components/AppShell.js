"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

// Shared frame for every role area. User details are placeholders until auth is wired.
export default function AppShell({ role, name, nav, children }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-8">
            <Logo href="/profiles" />
            <nav className="hidden gap-1 font-ui text-sm md:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    pathname === item.href ? "bg-foreground text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="chip bg-yellow capitalize">{role}</span>
            <Link href="/profiles" aria-label="Switch profile" className="grid h-10 w-10 place-items-center rounded-full bg-lilac font-display font-bold">
              {name[0]}
            </Link>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-2 font-ui text-sm md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${
                pathname === item.href ? "bg-surface-2" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

export function Stat({ label, value, hint, tone = "text-foreground" }) {
  return (
    <div className="card">
      <div className="font-ui text-sm text-muted">{label}</div>
      <div className={`mt-1 font-display text-3xl font-semibold ${tone}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Bar({ value, color = "var(--teal)" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-semibold">{children}</h2>
      {action}
    </div>
  );
}
