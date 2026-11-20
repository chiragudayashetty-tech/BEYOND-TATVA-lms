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
