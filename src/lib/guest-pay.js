import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { COURSE_ID } from "@/lib/catalog";

// Guest checkout on /pay (no login). The payment is recorded against the parent's mobile number and waits
// as a pending purchase; it unlocks when that number signs in with a WhatsApp code (claim_purchases matches a
// verified login phone only), so typing someone else's number can never open their account to the payer.
export const tenDigits = (v) => String(v || "").replace(/\D/g, "").slice(-10);
export const validMobile = (p) => /^[6-9]\d{9}$/.test(p);

// Price in rupees from the database (or a Studio coupon), never from the browser. null = coupon not valid.
export async function guestPrice(code) {
  const admin = createAdminClient();
  if (code) {
    const { data } = await admin.rpc("coupon_price", { p_code: code, p_course: COURSE_ID });
    return Number.isInteger(data) ? data : null;
  }
  const { data } = await admin.from("courses").select("price_inr").eq("id", COURSE_ID).single();
  return Number.isInteger(data?.price_inr) ? data.price_inr : null;
}

// Safe to call many times (verify + webhook): the payment id is the purchase reference.
export function recordGuestPurchase(paymentId, phone, amountPaise) {
  return createAdminClient().rpc("record_purchase", {
    p_reference: paymentId,
    p_phone: `+91${phone}`,
    p_amount_paise: Number.isInteger(amountPaise) ? amountPaise : null,
  });
}
