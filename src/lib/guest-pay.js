import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { COURSE_ID } from "@/lib/catalog";
import { createHmac, timingSafeEqual } from "node:crypto";

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

// Safe to call many times (verify + webhook): the payment id is the purchase and lead reference.
// Also saves a lead (source "pay-page") so the payer shows in Pipeline before they sign in.
export async function recordGuestPurchase(paymentId, phone, amountPaise) {
  const admin = createAdminClient();
  const result = await admin.rpc("record_purchase", {
    p_reference: paymentId,
    p_phone: `+91${phone}`,
    p_amount_paise: Number.isInteger(amountPaise) ? amountPaise : null,
  });
  const { error } = await admin.rpc("record_lead", {
    p_reference: `pay:${paymentId}`,
    p_phone: `+91${phone}`,
    p_source: "pay-page",
    p_details: { paid: true, payment_id: paymentId, amount_inr: Number.isInteger(amountPaise) ? amountPaise / 100 : null },
  });
  if (error) console.error("guest lead failed", paymentId, error.message); // the payment is what matters
  return result;
}

// Proof that this browser made the payment (given only by guest-verify after a valid Razorpay signature).
// Lets the payer sign in with a different number and move the waiting payment there ("Change number").
function claimSecret() {
  return (process.env.RAZORPAY_KEY_SECRET || "").trim();
}
export function claimToken(paymentId) {
  const secret = claimSecret();
  return secret ? createHmac("sha256", secret).update(`guest-claim|${paymentId}`).digest("hex").slice(0, 32) : "";
}
export function claimTokenValid(paymentId, token) {
  const expected = claimToken(String(paymentId || ""));
  const a = Buffer.from(expected), b = Buffer.from(String(token || ""));
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
