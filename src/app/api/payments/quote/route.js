import { NextResponse } from "next/server";
import { fail, payingStudent, priceFor, readJson } from "@/lib/payments/server";

// POST { coupon } → the price the student will pay, so the unlock page can show a discount before checkout.
export async function POST(request) {
  const student = await payingStudent();
  if (student.error) return student.error;
  const { coupon } = await readJson(request);
  try {
    const p = await priceFor(coupon);
    return NextResponse.json({
      amountPaise: p.amountPaise, listPaise: p.listPaise, discountPaise: p.discountPaise, percentOff: p.percentOff,
      coupon: p.coupon, couponInvalid: p.couponInvalid,
    });
  } catch (e) {
    console.error("quote failed", e);
    return fail(503, "Online payment isn't available right now. Try again in a few minutes.");
  }
}
