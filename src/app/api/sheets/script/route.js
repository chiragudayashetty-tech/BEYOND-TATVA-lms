import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { sheetsKeyValid } from "@/lib/sheets-key";

// The sync code for the Google Sheets, served to the tiny loader pasted in each sheet (scripts/sheets-loader.gs).
// The sheets fetch this on every run, so a fix ships with a normal deploy: nobody re-pastes code into a sheet.
//   GET /api/sheets/script?book=outreach|tracker   header x-sheets-key = SHEETS_SYNC_SECRET → JavaScript text
export const dynamic = "force-dynamic";
const FILES = { outreach: "sheets-sync.gs", tracker: "leads-tracker-sync.gs" };

export async function GET(request) {
  if (!sheetsKeyValid(request.headers.get("x-sheets-key"))) {
    console.warn("sheets script: bad key");
    return NextResponse.json({ error: "bad key" }, { status: 401 });
  }
  const file = FILES[new URL(request.url).searchParams.get("book")];
  if (!file) return NextResponse.json({ error: "book must be outreach or tracker" }, { status: 400 });
  const code = await readFile(path.join(process.cwd(), "scripts", file), "utf8");
  return new NextResponse(code, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
