import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sheetsKeyValid } from "@/lib/sheets-key";
import { runAutomations } from "@/lib/automations";

// Sends queued WhatsApp messages through AiSensy. Started every 5 minutes by the School Leads Tracker Apps Script
// (scripts/leads-tracker-sync.gs, header x-sheets-key = SHEETS_SYNC_SECRET), so no paid cron is needed.
//   POST /api/automations/run?since=<ISO>  → { sent, failed, waiting?, off?, log: [...finished since <since>] }
// The log feeds the sheet's "Automations" tab.
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!sheetsKeyValid(request.headers.get("x-sheets-key"))) return NextResponse.json({ error: "bad key" }, { status: 401 });
  const db = createAdminClient();
  let result;
  try {
    // Sentry cron monitor: alerts if the 5-minute sender stops running or keeps failing.
    result = await Sentry.withMonitor("whatsapp-automations", () => runAutomations(db), {
      schedule: { type: "interval", value: 5, unit: "minute" }, checkinMargin: 10, maxRuntime: 5, timezone: "Asia/Kolkata",
    });
  } catch (e) {
    console.error("automations run failed", e.message);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 });
  }
  const since = Date.parse(new URL(request.url).searchParams.get("since") ?? "");
  const from = Number.isFinite(since) ? new Date(Math.max(since, Date.now() - 7 * 86400_000)) : new Date(Date.now() - 86400_000);
  const { data: log } = await db.rpc("automation_log", { p_since: from.toISOString() });
  return NextResponse.json({ ...result, log: log ?? [], at: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
