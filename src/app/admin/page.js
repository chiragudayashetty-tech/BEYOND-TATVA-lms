import { Building2, Clock, Film, GraduationCap, MessageCircle, Plus, School, Sheet, UploadCloud, Users, Webhook, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, IconTile, PageTitle, StatCard } from "@/components/ui";
import { iconFor } from "@/components/course";
import { courses } from "@/lib/catalog";
import { automations, integrations } from "@/lib/demo";

export const metadata = { title: "Admin · Beyond Tatva" };

const icons = { Sheet, Zap, Building2, MessageCircle, Webhook, School };

export default function AdminPage() {
  return (
    <Shell roles={["admin"]} greeting>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Schools" value="4" hint="+1 this month" icon={Building2} />
        <StatCard label="Active students" value="312" hint="This week" icon={Users} tone="success" />
        <StatCard label="Learning hours" value="486" hint="This week" icon={Clock} tone="warning" />
        <StatCard label="Courses" value={courses.length} hint={`${courses.reduce((a, c) => a + c.lessonCount, 0)} lessons`} icon={GraduationCap} />
      </div>

      <div id="content" className="mt-6 grid scroll-mt-24 gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Card title="Upload a lesson">
          <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition hover:border-primary hover:bg-primary-soft/40">
            <IconTile icon={UploadCloud} size="lg" />
            <span className="mt-3 font-semibold">Drop a video here, or browse</span>
            <span className="mt-1 text-sm text-muted">MP4 up to 5 GB. Streamed in HD without buffering.</span>
            <input type="file" accept="video/*" className="hidden" />
          </label>
          <div className="mt-4 space-y-3">
            <div><label className="label" htmlFor="lt">Lesson title</label><input id="lt" className="input" placeholder="Summarise any chapter in 2 minutes" /></div>
            <div><label className="label" htmlFor="lc">Course</label>
              <select id="lc" className="input" defaultValue="">
                <option value="" disabled>Choose a course</option>
                {courses.map((c) => <option key={c.id}>{c.title}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full"><Film className="h-4 w-4" /> Save lesson</button>
          </div>
        </Card>

        <Card title="Courses" action={<button className="btn-secondary px-3 py-2"><Plus className="h-4 w-4" /> New course</button>}>
          <ul className="divide-y divide-border">
            {courses.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <IconTile icon={iconFor(c)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.title}</div>
                  <div className="text-xs text-muted">{c.lessonCount} lessons · {c.grade}</div>
                </div>
                <Badge tone="success">Published</Badge>
              </li>
            ))}
          </ul>
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
