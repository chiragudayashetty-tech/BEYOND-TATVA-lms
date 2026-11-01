import { NextResponse } from "next/server";
import { COURSE_ID } from "@/lib/catalog";
import { STALL_HOURS, toCsv } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";

// Studio → Pipeline → Export CSV. admin_pipeline refuses anyone who isn't a Studio admin.
export async function GET(request) {
  const stage = Number(new URL(request.url).searchParams.get("stage")) || null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_pipeline", { p_course: COURSE_ID, p_stall_hours: STALL_HOURS });
  if (error) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const rows = (data ?? []).filter((r) => !stage || r.stage === stage);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pipeline-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
