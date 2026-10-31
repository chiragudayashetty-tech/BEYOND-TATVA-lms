// Pure pricing maths, shared by the quote and order routes (and unit-tested).

export const normaliseCoupon = (code) => (typeof code === "string" ? code.trim().toUpperCase().slice(0, 32) : "");

// coupon: a row from public.coupons or null. Returns amounts in paise.
export function quote(priceInr, coupon, now = new Date()) {
  const list = Math.round(Number(priceInr) * 100);
  if (!Number.isFinite(list) || list <= 0) throw new Error("Course price is not set");
  const valid = coupon && coupon.active && (!coupon.expires_at || new Date(coupon.expires_at) > now);
  const percent = valid ? coupon.percent_off : 0;
  // Razorpay's minimum is ₹1; a 100% coupon should be an access key instead.
  const amount = Math.max(100, Math.round((list * (100 - percent)) / 100));
  return { listPaise: list, amountPaise: amount, discountPaise: list - amount, percentOff: percent, coupon: valid ? coupon.code : null };
}
