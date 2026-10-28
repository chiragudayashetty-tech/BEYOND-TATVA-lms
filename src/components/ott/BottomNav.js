"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { studentLinks } from "./TopNav";

// Phone tab bar, the way OTT mobile apps navigate.
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-3xl bg-foreground p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-xl md:hidden">
      {studentLinks.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition ${active ? "bg-yellow text-foreground" : "text-slate-400"}`}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
