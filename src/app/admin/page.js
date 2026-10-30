import { Building2, CalendarClock, Clock, KeyRound, MessageCircle, Plus, School, Sheet, UploadCloud, Users, Webhook, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, IconTile, PageTitle, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { course, fmtPremiere, isReleased, nextPremiere } from "@/lib/catalog";
import { isPreview } from "@/lib/supabase/server";
import KeyGenerator from "./KeyGenerator";
import { automations, integrations } from "@/lib/demo";

export const metadata = { title: "Admin · Beyond Tatva" };

const icons = { Sheet, Zap, Building2, MessageCircle, Webhook, School };

export default function AdminPage() {
  const next = nextPremiere();
  return (
    <Shell roles={["admin"]} greeting>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Students enrolled" value="312" hint="4 schools" icon={Users} />
        <StatCard label="Unlocked full course" value="248" hint="236 keys · 12 paid" icon={KeyRound} tone="success" />
        <StatCard label="Watch hours" value="486" hint="This week" icon={Clock} tone="warning" />
        <StatCard label="Next premiere" value={next ? `M${next.n}` : "Done"} hint={next ? fmtPremiere(next.release) : "All modules out"} icon={CalendarClock} />
      </div>

      <div id="content" className="mt-6 grid scroll-mt-24 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Release schedule" action={<span className="text-xs text-muted">Sundays, 6 PM IST</span>}>
          <ul className="divide-y divide-border">
            {course.modules.map((m) => {
              const out = isReleased(m);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <IconTile icon={iconFor(m)} tone={out ? "primary" : "neutral"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">Module {m.n}: {m.title}</div>
                    <div className="text-xs text-muted">{m.lessons.length} lessons · {fmtPremiere(m.release)}</div>
                  </div>
                  {m.free && <Badge tone="success">Free</Badge>}
                  <Badge tone={out ? "success" : "primary"}>{out ? "Live" : "Scheduled"}</Badge>
                  <button className="btn-secondary px-3 py-1.5 text-xs"><UploadCloud className="h-3.5 w-3.5" /> Videos</button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Access keys for schools">
          <p className="-mt-2 mb-4 text-sm text-muted">Create one key per student. Each key unlocks modules 1–6 for one student.</p>
          <KeyGenerator courseId={course.id} preview={isPreview} />
        </Card>
      </div>
      <section id="integrations" className="mt-8 scroll-mt-24">
        <PageTitle title="Integrations" subtitle="Connect Beyond Tatva to the tools you already use." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {integrations.map((i) => (
            <div key={i.name} className="card flex items-center gap-4 p-4">
              <IconTile icon={icons[i.icon] ?? Zap} tone={i.connected ? "success" : "neutral"} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{i.name}</div>
                <div className="text-xs text-muted">{i.desc}</div>
              </div>
              {i.connected ? <Badge tone="success">Connected</Badge> : <button className="btn-secondary px-3 py-1.5 text-xs">Connect</button>}
            </div>
          ))}
        </div>
      </section>

      <section id="automations" className="mt-8 scroll-mt-24">
        <PageTitle title="Automations" subtitle="Rules that run on their own.">
          <button className="btn-primary"><Plus className="h-4 w-4" /> New automation</button>
        </PageTitle>
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.when} className="card flex flex-wrap items-center gap-3 p-4">
              <Badge tone="primary">When</Badge>
              <span className="text-sm font-semibold">{a.when}</span>
              <Badge>Then</Badge>
              <span className="flex-1 text-sm text-muted">{a.then}</span>
              <span role="switch" aria-checked={a.on} className={`relative h-6 w-11 rounded-full ${a.on ? "bg-primary" : "bg-border"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${a.on ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
