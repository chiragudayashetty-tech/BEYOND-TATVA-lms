import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { getLeaderboard } from "@/lib/data";

export const metadata = { title: "Leaderboard · Beyond Tatva" };

// Full XP leaderboard (top 200). First name + initial only; hidden students are left out.
export default async function Leaderboard() {
  const board = await getLeaderboard(200);
  const top = board?.top ?? [];
  return (
    <Shell roles={["student"]}>
      <Link href="/browse" className="btn-ghost -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> Home</Link>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <span className="text-sm text-muted">{board?.players ?? 0} learners</span>
      </div>
      {board?.me && !board.me.hidden && <div className="mb-3 flex min-h-12 items-center gap-3 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-fg"><span className="w-8">#{board.me.rank}</span><span className="flex-1">You</span><span>{board.me.xp} XP</span></div>}
      {top.length === 0 ? <p className="text-sm text-muted">No one has XP yet. Finish a module or take a quiz to be first.</p> : (
        <ol className="space-y-2">
          {top.map((p) => (
            <li key={`${p.rank}-${p.name}`} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm ${p.me ? "bg-primary-soft font-bold" : "bg-surface-2"}`}>
              <span className="flex w-8 items-center gap-1 font-semibold text-muted">{p.rank === 1 && <Crown className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />}{p.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{p.me ? "You" : p.name}</span>
              <span className="tabular-nums text-muted">{p.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
      {board?.me?.hidden && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">You&apos;re hidden from the leaderboard. <Link href="/profile" className="font-medium text-primary underline">Change this in Profile</Link></p>}
    </Shell>
  );
}
