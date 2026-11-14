// Password login: one box takes a phone number or an email. Pure helpers, tested in tests/login-id.test.mjs.
//
// Phone accounts are stored with a hidden login address <91XXXXXXXXXX>@phone.beyondtatva.in (Supabase signs
// in with email + password without needing SMS) and the real phone on the account. Nothing is ever sent to
// that address. It can never be a Studio admin: the Studio list matches "@beyondtatva.in" exactly.
export const PHONE_ALIAS_DOMAIN = "phone.beyondtatva.in";
export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// "98450 12345", "+91 98450-12345", "919845012345" → "919845012345". Indian mobiles only.
export function indianMobile(input) {
  const d = String(input ?? "").replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d.length === 10 ? d : null;
  return ten && /^[6-9]\d{9}$/.test(ten) ? `91${ten}` : null;
}

// { kind: "phone", phone, email } | { kind: "email", email } | null (not a phone number or email).
export function parseLoginId(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254 || isPhoneAlias(email)) return null;
    return { kind: "email", email };
  }
  const phone = indianMobile(raw);
  return phone ? { kind: "phone", phone, email: `${phone}@${PHONE_ALIAS_DOMAIN}` } : null;
}

export const isPhoneAlias = (email) => String(email ?? "").toLowerCase().endsWith(`@${PHONE_ALIAS_DOMAIN}`);

// What to show a person as "you sign in with": the phone for phone accounts, never the hidden address.
export function loginLabel(user) {
  if (!user) return "";
  if (user.email && !isPhoneAlias(user.email)) return user.email;
  const phone = user.phone || (isPhoneAlias(user.email) ? user.email.split("@")[0] : "");
  return phone ? `+${phone.slice(0, 2)} ${phone.slice(2, 7)} ${phone.slice(7)}` : "";
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
export const isStaffDomain = (email) => /@([a-z0-9-]+\.)*beyondtatva\.in$/i.test(String(email ?? "")) && !isPhoneAlias(email);
