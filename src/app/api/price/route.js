import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { COURSE_ID } from "@/lib/catalog";

// GET /api/price: the course price set in Admin → Content. Public (it's on the website anyway).
// The website shows it and its Razorpay checkout charges it. Cached for 60 seconds.
export const revalidate = 60;

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("courses").select("price_inr, list_price_inr").eq("id", COURSE_ID).single();
  if (error || !data?.price_inr) return NextResponse.json({ error: "Price unavailable" }, { status: 503, headers: { ...CORS, "cache-control": "no-store" } });
  return NextResponse.json(
    { course: COURSE_ID, price: data.price_inr, list_price: data.list_price_inr ?? null, currency: "INR" },
    { headers: { ...CORS, "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
