import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sheetsKeyValid } from "@/lib/sheets-key";

// Google Sheets ↔ Supabase sync, called only by the Apps Script inside Chirag's two sheets
// (scripts/sheets-sync.gs). Header x-sheets-key must equal SHEETS_SYNC_SECRET.
//   GET  /api/sheets                          → { leads: [...], schools: [...], at }   (snapshot incl. Signed up / Module 0 / Paid)
//   POST /api/sheets { kind: "leads"|"schools", rows: [...] } → [{ row, id, result, error?, duplicate_phone? }]
export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "bad key" }, { status: 401 });

export async function GET(request) {
  if (!sheetsKeyValid(request.headers.get("x-sheets-key"))) return deny();
  const { data, error } = await createAdminClient().rpc("sheet_snapshot");
  if (error) {
    console.error("sheet snapshot failed", error.message);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 });
  }
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}

export async function POST(request) {
  if (!sheetsKeyValid(request.headers.get("x-sheets-key"))) return deny();
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const fn = { leads: "sheet_upsert_leads", schools: "sheet_upsert_schools" }[body?.kind];
  if (!fn || !Array.isArray(body.rows)) return NextResponse.json({ error: "kind must be leads or schools, rows a list" }, { status: 400 });
  const db = createAdminClient();
  const { data, error } = await db.rpc(fn, { p_rows: body.rows });
  if (!error && body.kind === "leads" && Array.isArray(data)) {
    // "LMS email" column → link the lead to that exact student account (when phone matching can't).
    const byRow = new Map(body.rows.map((r) => [r.row, r]));
    for (const res of data) {
      const sent = byRow.get(res.row);
      if (!res.id || !sent || !("lms_email" in sent)) continue;
      const { data: link } = await db.rpc("sheet_link_lead", { p_lead: res.id, p_email: String(sent.lms_email ?? "") });
      if (link === "unknown_email") res.link = "No LMS account with this email";
    }
  }
  if (error) {
    console.error("sheet push failed", body.kind, error.message);
    return NextResponse.json({ error: /rows must/.test(error.message) ? error.message : "temporary failure" }, { status: /rows must/.test(error.message) ? 400 : 500 });
  }
  return NextResponse.json(data);
}
