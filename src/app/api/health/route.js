import { NextResponse } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// GET /api/health: is the app up and can it reach Supabase? For uptime monitors (e.g. UptimeRobot).
// Adapted from the isolated Codex copy. Reveals nothing beyond ok/degraded.
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let database = false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    database = res.status < 500; // any answer from Supabase means it's reachable
  } catch {
    database = false;
  }
  return NextResponse.json(
    { status: database ? "ok" : "degraded", database, ms: Date.now() - started },
    { status: database ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
