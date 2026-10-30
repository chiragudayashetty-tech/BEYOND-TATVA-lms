import { ArrowDown, ArrowUp, Crown, Minus } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Avatar, PageTitle } from "@/components/ui";
import { leaderboard } from "@/lib/demo";

export const metadata = { title: "Leaderboard · Beyond Tatva" };

function Change({ n }) {
  if (n > 0) return <span className="inline-flex items-center text-xs font-medium text-success"><ArrowUp className="h-3.5 w-3.5" />{n}</span>;
  if (n < 0) return <span className="inline-flex items-center text-xs font-medium text-danger"><ArrowDown className="h-3.5 w-3.5" />{-n}</span>;
  return <Minus className="h-3.5 w-3.5 text-subtle" />;
}

export default function LeaderboardPage() {
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Leaderboard" subtitle="This week at St. Mary's School. Resets every Monday.">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-surface p-1 text-sm">
          {["This week", "This month", "All time"].map((t, i) => (
            <span key={t} className={`rounded-lg px-3 py-1.5 font-medium ${i === 0 ? "bg-primary text-primary-fg" : "text-muted"}`}>{t}</span>
          ))}
        </div>
      </PageTitle>

      <div className="mb-6 grid grid-cols-3 items-end gap-3 sm:gap-4">
        {podium.map((p, i) => {
          const place = [2, 1, 3][i];
          return (
            <div key={p.name} className={`card flex flex-col items-center p-4 text-center ${place === 1 ? "pb-8 sm:pb-10" : ""} ${p.me ? "border-primary" : ""}`}>
              {place === 1 && <Crown className="mb-1 h-5 w-5 text-warning" />}
              <Avatar name={p.name} size={place === 1 ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm"} />
              <div className="mt-3 truncate text-sm font-semibold">{p.name}</div>
              <div className="text-xs text-muted">{p.xp.toLocaleString("en-IN")} XP</div>
              <div className={`mt-3 grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${place === 1 ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted"}`}>{place}</div>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <ol>
          {leaderboard.map((p, i) => (
            <li key={p.name} className={`flex items-center gap-4 border-b border-border px-4 py-3 last:border-0 sm:px-5 ${p.me ? "bg-primary-soft" : ""}`}>
              <span className="w-6 text-center text-sm font-semibold text-muted">{i + 1}</span>
              <Avatar name={p.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}{p.me && <span className="ml-2 text-xs font-medium text-primary">You</span>}</div>
                <div className="text-xs text-muted">{p.school}</div>
              </div>
              <Change n={p.change} />
              <span className="w-20 text-right text-sm font-semibold">{p.xp.toLocaleString("en-IN")} XP</span>
            </li>
          ))}
        </ol>
      </div>
    </Shell>
  );
}
