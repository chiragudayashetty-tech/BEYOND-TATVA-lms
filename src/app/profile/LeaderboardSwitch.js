"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LeaderboardSwitch({ hidden = false }) {
  const router = useRouter(); const [isHidden, setIsHidden] = useState(hidden); const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  function toggle() {
    const next = !isHidden; setIsHidden(next); setError("");
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("set_leaderboard_hidden", { p_hidden: next });
      if (rpcError) { setIsHidden(!next); setError("Could not save this setting. Please try again."); return; }
      router.refresh();
    });
  }
  return <div className="px-5 py-3">
    <div className="flex items-center gap-4"><div className="min-w-0 flex-1"><div className="text-sm font-medium">Show me on the leaderboard</div><p className="text-xs text-muted">Other students see your first name and initial only.</p></div>
      <button type="button" role="switch" aria-checked={!isHidden} aria-label="Show me on the leaderboard" disabled={pending} onClick={toggle} className="grid h-11 w-11 shrink-0 place-items-center disabled:opacity-50">
        <span className={`relative h-6 w-11 rounded-full transition ${!isHidden ? "bg-primary" : "bg-border"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${!isHidden ? "left-[22px]" : "left-0.5"}`} /></span>
      </button></div>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
  </div>;
}
