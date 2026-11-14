// Password accounts (Chirag 2026-11-14): every account has an email AND a mobile number, both on the
// Supabase user, and signs in with either one + the password. Pure helpers, tested in tests/login-id.test.mjs.
export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// "98450 12345", "+91 98450-12345", "919845012345" → "919845012345". Indian mobiles only.
export function indianMobile(input) {
  const d = String(input ?? "").replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d.length === 10 ? d : null;
  return ten && /^[6-9]\d{9}$/.test(ten) ? `91${ten}` : null;
}

export function cleanEmail(input) {
  const email = String(input ?? "").trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

// Login box: { kind: "phone", phone } | { kind: "email", email } | null.
export function parseLoginId(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    const email = cleanEmail(raw);
    return email ? { kind: "email", email } : null;
  }
  const phone = indianMobile(raw);
  return phone ? { kind: "phone", phone } : null;
}

export const showPhone = (p) => (p && p.length === 12 ? `+${p.slice(0, 2)} ${p.slice(2, 7)} ${p.slice(7)}` : p || "");

// "you sign in with …": email and/or phone.
export function loginLabel(user) {
  if (!user) return "";
  return [user.email, showPhone(user.phone)].filter(Boolean).join(" or ");
}

// null when fine, else a sentence a 13-year-old understands.
export function passwordProblem(pw) {
  const p = String(pw ?? "");
  if (p.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (p.length > 72) return "That password is too long (72 characters max).";
  if (/^\d+$/.test(p) || /^(.)\1+$/.test(p) || /^(password|12345678|qwertyui)/i.test(p)) return "That password is too easy to guess. Mix letters and numbers.";
  return null;
}

// Studio admin addresses can never be created with a password here: an admin must prove the inbox
// (Google or email code). Exact "@beyondtatva.in" or anything under it.
export const isStaffDomain = (email) => /@([a-z0-9-]+\.)*beyondtatva\.in$/i.test(String(email ?? ""));
