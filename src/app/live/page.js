import { Bell, CalendarDays, Clock, PlayCircle, Radio, Video } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, PageTitle } from "@/components/ui";
import { Thumb } from "@/components/course";
import { getModule } from "@/lib/catalog";
import { recordings, upcomingLive } from "@/lib/demo";

export const metadata = { title: "Live Classes · Beyond Tatva" };

export default function LivePage() {
  const [now, ...later] = upcomingLive;
  return (
    <Shell roles={["student", "teacher"]}>
      <PageTitle title="Live Classes" subtitle="Join live, ask questions, and catch the recording if you miss one." />

      <div className="card grid overflow-hidden md:grid-cols-[1.2fr_1fr]">
        <Thumb module={getModule(now.module)} className="aspect-video md:aspect-auto md:min-h-64">
          <span className="chip absolute left-4 top-4 bg-danger text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live today</span>
        </Thumb>
        <div className="flex flex-col justify-center p-6">
          <div className="text-sm font-medium text-primary">{now.day} · {now.time}</div>
          <h2 className="mt-1 text-2xl font-semibold">{now.title}</h2>
          <p className="mt-2 text-sm text-muted">with {now.host}. Bring your questions about careers that use AI.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-primary"><Video className="h-4 w-4" /> Join class</button>
            <button className="btn-secondary"><CalendarDays className="h-4 w-4" /> Add to planner</button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Upcoming">
          <ul className="divide-y divide-border">
            {later.map((s) => (
              <li key={s.title} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-center text-primary">
                  <div className="text-xs font-semibold leading-tight">{s.day}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" /> {s.time} · {s.host}</div>
                </div>
                <button className="btn-secondary px-3 py-2 text-xs"><Bell className="h-3.5 w-3.5" /> Remind me</button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recordings" action={<Badge><Radio className="h-3 w-3" /> {recordings.length} new</Badge>}>
          <ul className="space-y-2">
            {recordings.map((r) => (
              <li key={r.title} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
                <Thumb module={getModule(r.module)} i={2} className="aspect-video w-28 shrink-0 rounded-lg">
                  <span className="absolute inset-0 grid place-items-center bg-black/25"><PlayCircle className="h-6 w-6 text-white" /></span>
                </Thumb>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-snug">{r.title}</div>
                  <div className="text-xs text-muted">{r.date} · {r.mins} min</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
