"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, BadgeCheck, BookOpen, CalendarCheck, CalendarDays, ChartLine, Circle, Clapperboard, ClipboardCheck, ClipboardList, Contact, Download, GraduationCap,
  House, KeyRound, LayoutDashboard, ListChecks, ReceiptText, School, User, UserCheck, Users, Workflow,
} from "lucide-react";

const Icons = {
  Activity, BadgeCheck, BookOpen, CalendarCheck, CalendarDays, ChartLine, Circle, Clapperboard, ClipboardCheck, ClipboardList, Contact, Download, GraduationCap,
  House, KeyRound, LayoutDashboard, ListChecks, ReceiptText, School, User, UserCheck, Users, Workflow,
};

// Lights up the tapped item straight away while its page loads (useLinkStatus must sit inside the Link).
function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={`pointer-events-none absolute inset-0 rounded-xl bg-primary/10 transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} />;
}

// Studio pages are dynamic, so by default Next.js only prefetches them up to the loading skeleton.
// When the admin shows intent (hover, keyboard focus, touch), prefetch the whole page with its data,
// so the tap usually opens the finished page. Only on intent: prefetching every admin page on sight
// would run ~15 pages of queries on each visit.
function NavLink({ href, ...props }) {
  const [intent, setIntent] = useState(false);
  if (!href.startsWith("/admin")) return <Link href={href} {...props} />;
  const warm = () => setIntent(true);
  return <Link href={href} prefetch={intent ? true : null} onMouseEnter={warm} onFocus={warm} onTouchStart={warm} {...props} />;
}

const isActive = (pathname, href) => {
  const path = href.split("#")[0];
  if (href.includes("#")) return false;
  return pathname === path || (!["/browse", "/admin"].includes(path) && pathname.startsWith(`${path}/`)) || (path === "/course" && (pathname.startsWith("/watch/") || pathname === "/unlock"));
};

export function SidebarLinks({ items }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon, group }) => {
        const Icon = Icons[icon] ?? Icons.Circle;
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            {group && <div className="mx-3 mb-1.5 mt-5 text-[11px] font-semibold uppercase tracking-wider text-subtle">{group}</div>}
            <NavLink href={href} aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-fg"}`}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              {label}
              <Pending />
            </NavLink>
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
              <NavLink href={href} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${active ? "text-primary" : "text-subtle"}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {label}
                <Pending />
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
