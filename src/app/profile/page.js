import Link from "next/link";
import { Bell, ChevronRight, CircleHelp, Headset, KeyRound, LogOut, MessageCircleQuestion, Moon, ShieldCheck } from "lucide-react";
import SocialLinks from "@/components/SocialLinks";
import { supportWhatsApp } from "@/lib/social";
import Shell from "@/components/shell/Shell";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { Avatar, Badge, Card, PageTitle } from "@/components/ui";
import { getSession } from "@/lib/supabase/server";
import ProfileEditor from "./ProfileEditor";
import LeaderboardSwitch from "./LeaderboardSwitch";
import ParentConfirm from "./ParentConfirm";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/data";

export const metadata = { title: "Profile · Beyond Tatva" };

function Row({ icon: Icon, label, hint, children, href, external }) {
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
  if (href && external) return <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2">{inner}</a>;
  return href
    ? <Link href={href} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2">{inner}</Link>
    : <div className="flex items-center gap-4 px-5 py-4">{inner}</div>;
}

export default async function ProfilePage() {
  const { user, profile } = await getSession();
  const student = profile?.role === "student";
  const board = student ? await getLeaderboard() : null;
  // Parent confirmation (migration 20261114000001). Read separately so the page still works before it is applied.
  let parent = null;
  if (student && user.id !== "preview") {
    const supabase = await createClient();
    const [{ data: p, error }, { data: text }] = await Promise.all([
      supabase.from("profiles").select("parent_verified_at, leaderboard_hidden").eq("id", user.id).maybeSingle(),
      supabase.from("consent_texts").select("body").eq("purpose", "parent_confirm").eq("active", true).maybeSingle(),
    ]);
    if (!error && p) parent = { verified: Boolean(p.parent_verified_at), hidden: p.leaderboard_hidden, wording: text?.body ?? "" };
  }
  const name = profile.full_name ? ` I'm ${profile.full_name}.` : "";
  const doubts = supportWhatsApp(`Hi Beyond Tatva!${name} I have a doubt in the course: `);
  const helpline = supportWhatsApp(`Hi Beyond Tatva!${name} I need help with my account.`);
  return (
    <Shell roles={["student", "teacher", "admin"]}>
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
          {student && (
            <div className="mt-6 rounded-xl border border-border p-4 text-left text-sm">
              <div className="text-xs font-medium uppercase tracking-wider text-muted">Parent or guardian</div>
              <div className="mt-1 font-medium">{profile.guardian_phone ?? "–"}</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                {profile.guardian_consent_at
                  ? <><ShieldCheck className="h-3.5 w-3.5 text-success" /><span className="text-success">Parent consent given</span></>
                  : <span className="text-warning">Parent consent not recorded yet.</span>}
              </div>
              {parent && process.env.WHATSAPP_TOKEN && <ParentConfirm verified={parent.verified} wording={parent.wording} />}
              <p className="mt-2 text-xs text-muted">This account opens only with {user.email ?? user.phone}. Course updates go to the parent&apos;s WhatsApp (coming soon).</p>
            </div>
          )}
        </Card>

        <div id="settings" className="space-y-6">
          {(doubts || helpline) && (
            <section className="card divide-y divide-border overflow-hidden">
              <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-subtle">Help on WhatsApp</div>
              {doubts && <Row icon={MessageCircleQuestion} label="Clear my doubts" hint="Stuck on a lesson? Ask us on WhatsApp" href={doubts} external />}
              {helpline && <Row icon={Headset} label="Helpline" hint="Login, payment or account help" href={helpline} external />}
            </section>
          )}
          <section className="card divide-y divide-border overflow-hidden">
            <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-subtle">Preferences</div>
            <Row icon={Moon} label="Dark mode" hint="Easier on the eyes at night"><ThemeSwitch /></Row>
            {student && <LeaderboardSwitch hidden={parent?.hidden ?? board?.me?.hidden ?? true} />}
            <Row icon={Bell} label="Notifications" hint="Class reminders and grades" href="/profile#settings" />
          </section>
          <section className="card divide-y divide-border overflow-hidden">
            <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-subtle">Account</div>
            <ProfileEditor userId={user.id} fullName={profile.full_name} avatar={profile.avatar} />
            <Row icon={KeyRound} label="Login and security" hint="You sign in with a one-time code" href="/profile#settings" />
            <Row icon={ShieldCheck} label="Privacy and data" hint="What we keep, and how to delete your account" href="/delete-account" />
            <Row icon={CircleHelp} label="Help and support" href="/help" />
          </section>
          <section className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="text-sm font-medium">Follow Beyond Tatva</div>
              <div className="text-xs text-muted">AI tips, new modules and student projects</div>
            </div>
            <SocialLinks />
          </section>
          <form action="/auth/signout" method="post">
            <button className="btn-secondary w-full text-danger sm:w-auto"><LogOut className="h-4 w-4" /> Log out</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
