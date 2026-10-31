import { createHmac, timingSafeEqual } from "node:crypto";

// Signature check for website → LMS enrollment calls (see src/app/api/enrollments/route.js).
const MAX_SKEW_SECONDS = 300;

export function verifySignature(rawBody, timestamp, signature, secret, now = Date.now()) {
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

