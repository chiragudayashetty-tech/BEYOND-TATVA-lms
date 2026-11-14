import { NextResponse } from "next/server";
import { COURSE_ID } from "@/lib/catalog";
import { STALL_HOURS, toCsv } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";
import { applyFilters, parseFilters } from "@/lib/crm";
import { todayIST } from "@/lib/outreach";

// Studio → Pipeline → Export CSV. admin_pipeline refuses anyone who isn't a Studio admin.
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const stage = Number(params.get("stage")) || null;
  const schools = params.get("view") === "schools";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_pipeline", { p_course: COURSE_ID, p_stall_hours: STALL_HOURS });
  if (error) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  // Same filters as the page (school, class, section, status, source, siblings, due, search).
  const f = parseFilters(Object.fromEntries(params));
  const rows = applyFilters((data ?? []).filter((r) => (schools === (r.source === "schools")) && (!stage || r.stage === stage)), f, todayIST());
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pipeline-${schools ? "schools" : "parents"}-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
