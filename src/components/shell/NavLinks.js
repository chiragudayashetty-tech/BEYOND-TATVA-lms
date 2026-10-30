"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award, BadgeCheck, BookOpen, CalendarDays, ChartLine, Circle, Clapperboard, ClipboardList, GraduationCap,
  House, LayoutDashboard, Plug, Radio, Smartphone, Swords, Trophy, User, Users, Workflow,
} from "lucide-react";

const Icons = {
  Award, BadgeCheck, BookOpen, CalendarDays, ChartLine, Circle, Clapperboard, ClipboardList, GraduationCap,
  House, LayoutDashboard, Plug, Radio, Smartphone, Swords, Trophy, User, Users, Workflow,
};

const isActive = (pathname, href) => {
  const path = href.split("#")[0];
  if (href.includes("#")) return false;
  return pathname === path || (path !== "/browse" && pathname.startsWith(`${path}/`)) || (path === "/courses" && pathname.startsWith("/title/"));
};

export function SidebarLinks({ items }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon }) => {
        const Icon = Icons[icon] ?? Icons.Circle;
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link href={href} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-fg"}`}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MobileTabs({ items }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map(({ href, label, icon }) => {
          const Icon = Icons[icon] ?? Icons.Circle;
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-primary" : "text-subtle"}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
