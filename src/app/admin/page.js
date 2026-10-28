import AppShell, { SectionTitle, Stat } from "@/components/AppShell";
import { automations, integrations, modules } from "@/lib/mock";
import { adminNav } from "@/lib/nav";

export default function AdminPage() {
  return (
    <AppShell role="admin" name="Chirag" nav={adminNav}>
      <h1 className="mb-6 text-2xl font-bold">Good morning, Chirag ☀️</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Schools" value="4" hint="+1 this month" />
        <Stat label="Active students" value="312" tone="text-teal" />
        <Stat label="Learning hours this week" value="486" tone="text-yellow" />
        <Stat label="Courses" value={modules.length} />
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="card">
          <SectionTitle>Upload a lesson</SectionTitle>
          <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border p-10 text-center transition hover:border-teal hover:bg-teal/5">
            <span className="text-4xl">🎬</span>
            <span className="mt-2 font-semibold">Drop a video here</span>
            <span className="text-sm text-muted">MP4 up to 5 GB · streamed in HD with no buffering</span>
            <input type="file" accept="video/*" className="hidden" />
          </label>
          <div className="mt-4 space-y-3">
            <input className="input" placeholder="Lesson title" />
            <select className="input" defaultValue="">
              <option value="" disabled>Add to course…</option>
              {modules.map((m) => <option key={m.id}>{m.title}</option>)}
            </select>
            <button className="btn-primary w-full">Save lesson</button>
          </div>
        </div>

        <div className="card">
          <SectionTitle action={<button className="btn-ghost py-1.5">+ New course</button>}>Courses</SectionTitle>
          <ul className="divide-y divide-border">
            {modules.map((m) => (
              <li key={m.id} className="flex items-center gap-4 py-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${m.color}33` }}>{m.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted">{m.lessons} lessons · {m.level}</div>
                </div>
                <span className="chip bg-teal/15 text-teal">Published</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mb-10">
        <SectionTitle>Integrations</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((i) => (
            <div key={i.name} className="card flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{i.name}</div>
                <div className="text-sm text-muted">{i.desc}</div>
              </div>
              {i.connected
                ? <span className="chip bg-teal/15 text-teal">Connected</span>
                : <button className="btn-ghost py-1.5">Connect</button>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle action={<button className="btn-yellow py-1.5">+ New automation</button>}>Automations</SectionTitle>
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.when} className="card flex flex-wrap items-center gap-3">
              <span className="chip bg-lilac/30 text-brand">When</span>
              <span className="font-medium">{a.when}</span>
              <span className="text-muted">→</span>
              <span className="flex-1 text-sm text-muted">{a.then}</span>
              <span className={`relative h-6 w-11 rounded-full ${a.on ? "bg-teal" : "bg-surface-2"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${a.on ? "left-6" : "left-1"}`} />
              </span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
