import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sheetsKeyValid } from "@/lib/sheets-key";

// School Leads Tracker ↔ LMS (scripts/leads-tracker-sync.gs). Separate from /api/sheets (School Outreach and
// the old per-school sheet), so a problem here never stops those. Header x-sheets-key = SHEETS_SYNC_SECRET.
//   GET  ?since=<ISO time from the last answer's "at">  → only leads changed since then (tiny, every 5 min)
//   GET  (no since)                                      → everything + all ids + school list (full, hourly)
//   POST { rows: [...] } (max 500)                       → [{ row, id, result, error?, siblings?, link? }]
export const dynamic = "force-dynamic";
const deny = (method) => {
  console.warn("tracker sync: bad key", method);
  return NextResponse.json({ error: "bad key" }, { status: 401 });
};

export async function GET(request) {
  if (!sheetsKeyValid(request.headers.get("x-sheets-key"))) return deny("GET");
  const since = new URL(request.url).searchParams.get("since");
  const sinceTime = since && !Number.isNaN(Date.parse(since)) ? new Date(Date.parse(since) - 60_000).toISOString() : null; // 1 min overlap
  const db = createAdminClient();
  const { data, error } = await db.rpc("tracker_snapshot", { p_since: sinceTime });
  if (error) {
    console.error("tracker snapshot failed", error.message);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 });
  }
  await db.rpc("sheet_sync_seen", { p_book: "tracker", p_kind: "pull", p_rows: data?.leads?.length ?? 0 });
  console.info("tracker sync: pull ok", { full: !sinceTime, leads: data?.leads?.length ?? 0 });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

export async function POST(request) {
  if (!sheetsKeyValid(request.headers.get("x-sheets-key"))) return deny("POST");
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!Array.isArray(body?.rows) || body.rows.length > 500) return NextResponse.json({ error: "rows must be a list of at most 500" }, { status: 400 });
  const db = createAdminClient();
  const { data, error } = await db.rpc("tracker_upsert_leads", { p_rows: body.rows });
  if (error) {
    console.error("tracker push failed", error.message);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 });
  }
  // "LMS email" column → link the lead to that exact student account.
  const byRow = new Map(body.rows.map((r) => [r.row, r]));
  for (const res of data ?? []) {
    const sent = byRow.get(res.row);
    if (!res.id || !sent || !("lms_email" in sent)) continue;
    const { data: link } = await db.rpc("sheet_link_lead", { p_lead: res.id, p_email: String(sent.lms_email ?? "") });
    if (link === "unknown_email") res.link = "No LMS account with this email";
  }
  await db.rpc("sheet_sync_seen", { p_book: "tracker", p_kind: "push", p_rows: body.rows.length });
  console.info("tracker sync: push ok", body.rows.length);
  return NextResponse.json(data);
}
