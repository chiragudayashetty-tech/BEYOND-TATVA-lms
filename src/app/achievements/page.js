import { Flame, Footprints, GraduationCap, Hammer, HeartHandshake, Lock, Sunrise, Target, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { PageTitle, Progress, Ring } from "@/components/ui";
import { badges } from "@/lib/demo";

export const metadata = { title: "Achievements · Beyond Tatva" };

const icons = { Flame, Footprints, GraduationCap, Hammer, HeartHandshake, Sunrise, Target, Zap };

export default function AchievementsPage() {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Achievements" subtitle="Badges you earn for showing up, doing well and helping others." />

      <div className="card mb-6 flex flex-wrap items-center gap-6 p-6">
        <Ring value={(earned / badges.length) * 100} size={112} stroke={10} tone="success">
          <div>
            <div className="font-display text-2xl font-semibold">{earned}<span className="text-base text-muted">/{badges.length}</span></div>
          </div>
        </Ring>
        <div>
          <h2 className="text-lg font-semibold">{earned} badges unlocked</h2>
          <p className="mt-1 text-sm text-muted">You&apos;re 2 days away from <span className="font-medium text-fg">Unstoppable</span>. Keep your streak going.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {badges.map((b) => {
          const Icon = icons[b.icon] ?? Target;
          return (
            <div key={b.id} className={`card flex flex-col items-center p-5 text-center ${b.earned ? "" : "opacity-70"}`}>
              <span className={`relative grid h-16 w-16 place-items-center rounded-2xl ${b.earned ? "bg-primary-soft text-primary" : "bg-surface-2 text-subtle"}`}>
                <Icon className="h-7 w-7" strokeWidth={1.75} />
                {!b.earned && <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-surface-2"><Lock className="h-3 w-3" /></span>}
              </span>
              <div className="mt-3 text-sm font-semibold">{b.title}</div>
              <div className="mt-0.5 text-xs text-muted">{b.body}</div>
              {!b.earned && <Progress value={b.progress} className="mt-3 h-1.5" />}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
