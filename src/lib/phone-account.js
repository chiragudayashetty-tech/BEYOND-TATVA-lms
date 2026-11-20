import { createHmac, timingSafeEqual } from "node:crypto";

// WhatsApp login for students who signed up before it existed (Chirag 2026-11-20): their number sits in
// profiles.student_phone / guardian_phone, but not on the login. Before a code is sent we put the number on
// that one existing account, so the code opens it instead of making a new, empty one. Safe because only the
// person holding the number gets the code. Never links when the number matches more than one account.

// "91XXXXXXXXXX" → the shapes a stored number may have.
export function phoneVariants(phone) {
  const ten = String(phone ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(ten)) return [];
  return [`+91${ten}`, `91${ten}`, ten, `0${ten}`, `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`];
}

// Student's own number wins; a parent's number only when exactly one account has it and it isn't marked siblings.
export function pickAccount(studentMatches, guardianMatches, isSiblingPhone) {
  const s = [...new Set(studentMatches)];
  if (s.length === 1) return s[0];
  if (s.length > 1 || isSiblingPhone) return null;
  const g = [...new Set(guardianMatches)];
  return g.length === 1 ? g[0] : null;
}

// Tables that hold a student's work or payments. An account with a row in any of them is never deleted from login.
export const WORK_TABLES = ["lesson_progress", "quiz_attempts", "assignment_submissions", "checkpoint_answers",
  "certificates", "course_access", "enrollments", "upi_claims", "learning_days"];

// First name only: whoever holds a parent's number sees which children are linked, nothing more.
export const firstName = (full) => String(full ?? "").trim().split(/\s+/)[0] || "Student (no name yet)";

// Proof that this browser typed a WhatsApp code for a number: "phone.expiry.hmac", in an httpOnly cookie,
// valid 30 minutes. Switching accounts trusts ONLY this number, never the phone of the account you switched
// into (otherwise one parent number could hop on to accounts linked to other numbers).
export const PROOF_COOKIE = "bt_wa_proof";
export const PROOF_SECONDS = 30 * 60;

export function signProof(phone, secret, now = Date.now()) {
  const exp = Math.floor(now / 1000) + PROOF_SECONDS;
  return `${phone}.${exp}.${createHmac("sha256", secret).update(`${phone}.${exp}`).digest("hex")}`;
}

export function readProof(value, secret, now = Date.now()) {
  const [phone, exp, mac] = String(value ?? "").split(".");
  if (!phone || !exp || !mac || !secret) return null;
  const good = createHmac("sha256", secret).update(`${phone}.${exp}`).digest("hex");
  if (mac.length !== good.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  return Number(exp) * 1000 > now ? phone : null;
}
