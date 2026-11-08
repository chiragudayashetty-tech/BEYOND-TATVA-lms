import { timingSafeEqual } from "node:crypto";

// The Google Sheets sync key (SHEETS_SYNC_SECRET), compared in constant time. Empty secret = sync off.
export function sheetsKeyValid(given, secret = process.env.SHEETS_SYNC_SECRET) {
  if (!secret || secret.length < 24 || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
