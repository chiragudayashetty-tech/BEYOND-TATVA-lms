import { NextResponse } from "next/server";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/payments/razorpay";
import { fail, payingStudent, priceFor, readJson } from "@/lib/payments/server";

// POST { coupon, parentConsent: true } → a Razorpay order for the signed-in student.
// The order id and the student's id are stored together; the webhook grants access to exactly this account.
export async function POST(request) {
  if (!razorpayConfigured()) return fail(503, "Online payment isn't switched on yet. Ask your school for an access key meanwhile.");
  const student = await payingStudent();
  if (student.error) return student.error;
  if (student.hasAccess) return fail(409, "This account already has the full course.");

  const { coupon, parentConsent } = await readJson(request);
  if (parentConsent !== true) return fail(400, "A parent or guardian needs to agree before paying.");

  try {
    const p = await priceFor(coupon);
    if (p.couponInvalid) return fail(400, "That coupon code isn't valid.");
    const order = await createRazorpayOrder({
      amountPaise: p.amountPaise,
      receipt: `bt_${student.user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: student.user.id, course_id: p.course.id, coupon: p.coupon ?? "" },
    });
    const { error } = await p.admin.from("payment_orders").insert({
      id: order.id,
      student_id: student.user.id,
      course_id: p.course.id,
      amount_paise: p.amountPaise,
      list_price_paise: p.listPaise,
      coupon_code: p.coupon,
      parent_consent_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amountPaise: p.amountPaise,
      currency: "INR",
      courseTitle: p.course.title,
      prefill: { name: student.profile.full_name, email: student.user.email ?? "", contact: student.profile.guardian_phone ?? "" },
    });
  } catch (e) {
    console.error("order failed", e);
    return fail(502, "We couldn't start the payment. Try again in a minute.");
  }
}
