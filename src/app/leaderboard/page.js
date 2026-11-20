import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { getLeaderboard } from "@/lib/data";

export const metadata = { title: "Leaderboard · Beyond Tatva" };

// Full XP leaderboard (top 200): "My batch" or "Everyone". First name + initial only; hidden students are left out.
export default async function Leaderboard({ searchParams }) {
  const scope = (await searchParams)?.scope === "batch" ? "batch" : "all";
  const board = await getLeaderboard(200, scope);
  const top = board?.top ?? [];
  const noBatch = scope === "batch" && board?.scope === "batch" && board.batch == null;
  const tab = (active) => `flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold ${active ? "bg-primary text-primary-fg" : "text-muted"}`;
  return (
    <Shell roles={["student"]}>
      <Link href="/browse" className="btn-ghost -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> Home</Link>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <span className="text-sm text-muted">{board?.players ?? 0} learners</span>
      </div>
      <nav className="mb-4 flex gap-1 rounded-2xl bg-surface-2 p-1" aria-label="Which leaderboard">
        <Link href="/leaderboard?scope=batch" className={tab(scope === "batch")} aria-current={scope === "batch" ? "page" : undefined}>{board?.batch && scope === "batch" ? `Batch ${board.batch}` : "My batch"}</Link>
        <Link href="/leaderboard" className={tab(scope === "all")} aria-current={scope === "all" ? "page" : undefined}>Everyone</Link>
      </nav>
      {board?.me && !board.me.hidden && <div className="mb-3 flex min-h-12 items-center gap-3 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-fg"><span className="w-8">#{board.me.rank}</span><span className="flex-1">You</span><span>{board.me.xp} XP</span></div>}
      {noBatch ? <p className="text-sm text-muted">You&apos;re not in a batch yet. Your batch board opens once you join the course.</p> : top.length === 0 ? <p className="text-sm text-muted">No one has XP yet. Finish a module or take a quiz to be first.</p> : (
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
