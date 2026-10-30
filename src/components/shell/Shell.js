import Logo from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { requireRole } from "@/lib/supabase/server";
import { nav } from "@/lib/nav";
import { me } from "@/lib/demo";
import { MobileTabs, SidebarLinks } from "./NavLinks";
import TopBar from "./TopBar";

const greet = () => {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// App frame for every signed-in page. `roles` limits who may open the page (admins can open all).
export default async function Shell({ roles, children, greeting = false }) {
  const { profile } = await requireRole(roles);
  const items = nav[profile.role] ?? nav.student;

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="px-5 py-5"><Logo href="/dashboard" /></div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarLinks items={items.main} />
          {items.more.length > 0 && (
            <>
              <div className="mx-3 mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-subtle">{profile.role === "admin" ? "Preview as" : "You"}</div>
              <SidebarLinks items={items.more} />
            </>
          )}
        </nav>
        <a href="/profile" className="m-3 flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-surface-2">
          <Avatar name={profile.full_name} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{profile.full_name}</div>
            <div className="text-xs text-muted">View profile</div>
          </div>
        </a>
      </aside>

      <TopBar
        name={profile.full_name}
        role={profile.role}
        streak={profile.role === "student" ? me.streak : null}
        greeting={greeting ? { top: `${greet()},`, name: profile.full_name } : null}
      />
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      <MobileTabs items={items.mobile} />
    </div>
  );
}
