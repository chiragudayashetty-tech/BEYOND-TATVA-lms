import { NextResponse } from "next/server";
import { readJson } from "@/lib/body";
import { createClient, getSession } from "@/lib/supabase/server";
import { COURSE_ID } from "@/lib/catalog";
import { createOrder, razorpayKeys } from "@/lib/razorpay";
import { hasPendingPurchase } from "@/lib/pending-purchase";

// POST /api/create-order { coupon? } → { order_id, amount, currency, key_id }
// Signed-in students without access only. The price comes from the database (Admin → Content),
// or a Studio coupon (coupon_price), never from the browser. The student id goes in the order notes so verify-payment can check it.
export async function POST(request) {
  const { user, profile, hasAccess } = await getSession();
  // Students, or a brand-new Google sign-in who hasn't filled in their details yet (pay first, details later).
  if (!user || (profile && profile.role !== "student")) return NextResponse.json({ error: "Sign in as a student first" }, { status: 401 });
  if (hasAccess) return NextResponse.json({ error: "The course is already unlocked" }, { status: 409 });
  if (!profile && (await hasPendingPurchase(user.email))) return NextResponse.json({ error: "You've already paid. Fill in your details to open the course.", next: "/onboarding?next=%2Fcourse" }, { status: 409 });
  const keys = razorpayKeys();
  if (!keys) return NextResponse.json({ error: "Online payments aren't set up yet" }, { status: 500 });

  const supabase = await createClient();
  const { tooBig, body } = await readJson(request);
  if (tooBig) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const code = typeof body?.coupon === "string" ? body.coupon.trim().toUpperCase().slice(0, 20) : "";
  const phone = String(body?.phone || "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
  let rupees;
  if (code) {
    const { data } = await supabase.rpc("coupon_price", { p_code: code, p_course: COURSE_ID });
    if (!Number.isInteger(data)) return NextResponse.json({ error: "That coupon code is not valid or has expired" }, { status: 400 });
    rupees = data;
  } else {
    const { data: course } = await supabase.from("courses").select("price_inr").eq("id", COURSE_ID).single();
    rupees = course?.price_inr;
  }
  const amount = Number.isInteger(rupees) ? rupees * 100 : 0;
  if (amount < 100) return NextResponse.json({ error: "Course price must be at least 100 paise" }, { status: 500 });

  try {
    const r = await createOrder(keys, {
      amount,
      currency: "INR",
      receipt: `lms_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      notes: { course: COURSE_ID, student_id: user.id, source: "lms", coupon: code, phone },
    });
    if (r.status === 401) return NextResponse.json({ error: "Razorpay authentication failed" }, { status: 401 });
    if (!r.ok) {
      console.error("razorpay order failed", r.status, r.data?.error?.description);
      return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ order_id: r.data.id, amount: r.data.amount, currency: r.data.currency, key_id: keys.id });
  } catch {
    return NextResponse.json({ error: "Could not reach Razorpay. Please try again." }, { status: 500 });
  }
}
