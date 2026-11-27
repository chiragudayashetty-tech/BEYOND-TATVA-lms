import { NextResponse } from "next/server";
import { readJson } from "@/lib/body";
import { COURSE_ID } from "@/lib/catalog";
import { createOrder, razorpayKeys } from "@/lib/razorpay";
import { guestPrice, tenDigits, validMobile } from "@/lib/guest-pay";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/guest-order { phone, coupon?, preview? } → { order_id, amount, currency, key_id } (or { amount } for preview)
// No login: /pay. The parent's mobile goes in the order notes (guest_phone); guest-verify and the webhook read it back.
export async function POST(request) {
  const { tooBig, body } = await readJson(request);
  if (tooBig) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const code = typeof body?.coupon === "string" ? body.coupon.trim().toUpperCase().slice(0, 20) : "";
  const rupees = await guestPrice(code);
  if (rupees === null) return NextResponse.json({ error: code ? "That coupon code is not valid or has expired" : "Price isn't set yet" }, { status: 400 });
  if (body?.preview) return NextResponse.json({ amount: rupees * 100 });

  const phone = tenDigits(body?.phone);
  if (!validMobile(phone)) return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
  // Already paid with this number and not signed in yet: stop a second payment, send them to sign in.
  // (A paid number whose payment is used can pay again: a parent paying for a second child.)
  const { data: waiting } = await createAdminClient().from("purchases").select("id").eq("phone", `+91${phone}`).eq("status", "pending").limit(1).maybeSingle();
  if (waiting) return NextResponse.json({ error: "You've already paid with this number. Sign in with it to open the course.", signin: `/login?phone=${phone}&next=%2Fcourse` }, { status: 409 });
  const keys = razorpayKeys();
  if (!keys) return NextResponse.json({ error: "Online payments aren't set up yet" }, { status: 500 });
  const amount = rupees * 100;
  if (amount < 100) return NextResponse.json({ error: "Course price must be at least ₹1" }, { status: 500 });
  try {
    const r = await createOrder(keys, {
      amount,
      currency: "INR",
      receipt: `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      notes: { course: COURSE_ID, source: "lms", guest_phone: phone, coupon: code },
    });
    if (!r.ok) {
      console.error("razorpay guest order failed", r.status, r.data?.error?.description);
      return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ order_id: r.data.id, amount: r.data.amount, currency: r.data.currency, key_id: keys.id });
  } catch {
    return NextResponse.json({ error: "Could not reach Razorpay. Please try again." }, { status: 500 });
  }
}
