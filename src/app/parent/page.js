import AppShell, { Bar, SectionTitle, Stat } from "@/components/AppShell";
import ScreenTimeChart from "@/components/ScreenTimeChart";
import { modules, screenTime } from "@/lib/mock";
import { parentNav } from "@/lib/nav";

const sum = (k) => screenTime.reduce((a, d) => a + d[k], 0);
const hm = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default function ParentPage() {
  return (
    <AppShell role="parent" name="Lakshmi" nav={parentNav}>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-teal text-2xl font-bold">A</div>
        <div>
          <h1 className="text-2xl font-bold">Ananya&apos;s week</h1>
          <p className="text-sm text-muted">Grade 9 · St. Mary&apos;s School, Udupi</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Learning this week" value={hm(sum("app"))} hint="↑ 18% vs last week" tone="text-teal" />
        <Stat label="Total phone screen time" value={hm(sum("device"))} hint="Avg 3h 17m a day" />
        <Stat label="Quiz average" value="91%" hint="Top 10% of class" tone="text-yellow" />
        <Stat label="Lessons completed" value="18" hint="3 this week" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="card">
          <SectionTitle action={<span className="chip bg-surface-2 text-muted">Last 7 days</span>}>Screen time</SectionTitle>
          <ScreenTimeChart data={screenTime} />
          <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">
            📱 Phone-wide screen time comes from the Beyond Tattva companion app on Ananya&apos;s Android phone, with your consent.
          </p>
        </div>

        <div className="card">
          <SectionTitle>Course progress</SectionTitle>
          <div className="space-y-4">
            {modules.filter((m) => m.progress > 0).map((m) => (
              <div key={m.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{m.emoji} {m.title}</span>
                  <span className="text-muted">{m.progress}%</span>
                </div>
                <Bar value={m.progress} color={m.color} />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-yellow/30 bg-yellow/5 p-4 text-sm">
            🏆 Ananya earned the <b>AI &amp; Me: Ethics</b> certificate!
          </div>
        </div>
      </div>
    </AppShell>
  );
}
