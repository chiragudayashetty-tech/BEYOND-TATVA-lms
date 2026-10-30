import Link from "next/link";
import { Bell, ChevronRight, CircleHelp, KeyRound, LogOut, Moon, ShieldCheck, UserRound } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { Avatar, Badge, Card, PageTitle } from "@/components/ui";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Profile · Beyond Tatva" };

function Row({ icon: Icon, label, hint, children, href }) {
  const inner = (
    <>
      <Icon className="h-5 w-5 text-muted" strokeWidth={1.75} />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children ?? <ChevronRight className="h-4 w-4 text-subtle" />}
    </>
  );
  return href
    ? <Link href={href} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2">{inner}</Link>
    : <div className="flex items-center gap-4 px-5 py-4">{inner}</div>;
}

export default async function ProfilePage() {
  const { user, profile } = await getSession();
  const student = profile?.role === "student";
  return (
    <Shell roles={["student", "parent", "teacher", "admin"]}>
      <PageTitle title="Profile" />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit text-center">
          <div className="flex flex-col items-center">
            <Avatar name={profile.full_name} size="h-20 w-20 text-2xl" />
            <h2 className="mt-4 text-xl font-semibold">{profile.full_name}</h2>
            <p className="text-sm text-muted">{user.email ?? user.phone}</p>
            <div className="mt-3 flex gap-2">
              <Badge tone="primary"><span className="capitalize">{profile.role}</span></Badge>
              {profile.grade && <Badge>Grade {profile.grade}</Badge>}
            </div>
          </div>
          {student && profile.invite_code && (
            <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-left">
              <div className="text-xs font-medium uppercase tracking-wider text-muted">Parent link code</div>
              <div className="mt-1 font-mono text-2xl font-semibold tracking-[0.25em]">{profile.invite_code}</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                {profile.guardian_consent_at
                  ? <><ShieldCheck className="h-3.5 w-3.5 text-success" /><span className="text-success">Parent linked and consent given</span></>
                  : <span className="text-warning">Share this with your parent so they can link their account.</span>}
              </div>
            </div>
          )}
        </Card>

        <div id="settings" className="space-y-6">
          <section className="card divide-y divide-border overflow-hidden">
            <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-subtle">Preferences</div>
            <Row icon={Moon} label="Dark mode" hint="Easier on the eyes at night"><ThemeSwitch /></Row>
            <Row icon={Bell} label="Notifications" hint="Class reminders, grades and streaks" href="/profile#settings" />
          </section>
          <section className="card divide-y divide-border overflow-hidden">
            <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-subtle">Account</div>
            <Row icon={UserRound} label="Edit profile" href="/profile#settings" />
            <Row icon={KeyRound} label="Login and security" hint="You sign in with a one-time code" href="/profile#settings" />
            <Row icon={ShieldCheck} label="Privacy and data" hint="What we collect and why, under the DPDP Act" href="/profile#settings" />
            <Row icon={CircleHelp} label="Help and support" href="/profile#settings" />
          </section>
          <form action="/auth/signout" method="post">
            <button className="btn-secondary w-full text-danger sm:w-auto"><LogOut className="h-4 w-4" /> Log out</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
