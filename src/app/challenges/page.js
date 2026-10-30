import { Bot, Clock, Lightbulb, Palette, SearchCheck, Users, Zap } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, IconTile, PageTitle, StatCard } from "@/components/ui";
import { challenges, me } from "@/lib/demo";

export const metadata = { title: "Challenges · Beyond Tatva" };

const icons = { Prompting: Lightbulb, Thinking: SearchCheck, Creative: Palette, Build: Bot };
const levelTone = { Easy: "success", Medium: "warning", Hard: "danger" };

export default function ChallengesPage() {
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Challenges" subtitle="Test your skills, earn XP and climb the leaderboard." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Your XP" value={me.xp.toLocaleString("en-IN")} icon={Zap} tone="warning" />
        <StatCard label="Level" value={me.level} hint={`${me.nextLevelXp - me.xp} XP to level ${me.level + 1}`} icon={Zap} />
        <StatCard label="Completed" value="7" hint="3 this month" icon={SearchCheck} tone="success" />
        <StatCard label="School rank" value={`#${me.rank}`} hint={`of ${me.classSize}`} icon={Users} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {challenges.map((c) => (
          <article key={c.id} className="card flex gap-4 p-5">
            <IconTile icon={icons[c.tag] ?? Lightbulb} size="lg" tone={levelTone[c.level] === "danger" ? "danger" : "primary"} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{c.title}</h3>
                <Badge tone={levelTone[c.level]}>{c.level}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{c.body}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1 font-semibold text-warning"><Zap className="h-3.5 w-3.5" /> +{c.xp} XP</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.ends}</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.joined} joined</span>
                <button className="btn-primary ml-auto px-4 py-2">Start</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}
