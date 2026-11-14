import { isHot, isOpen } from "./outreach.js";
// Studio → Today: who to contact, in what order. Pure helpers (tested in tests/today.test.mjs).

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
export const istToday = (now = new Date()) => ymd.format(now);
export const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const shortDate = (day) => (day ? new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "");

// "overdue" | "today" | "soon" (within 7 days) | "later" | "none"
export function due(nextDate, today) {
  if (!nextDate) return "none";
  const d = String(nextDate).slice(0, 10);
  if (d < today) return "overdue";
  if (d === today) return "today";
  return d <= addDays(today, 7) ? "soon" : "later";
}
const rank = { overdue: 0, today: 1, soon: 2, later: 3, none: 4 };
const byDue = (today) => (a, b) => rank[due(a.next_date, today)] - rank[due(b.next_date, today)] || String(a.next_date ?? "").localeCompare(String(b.next_date ?? ""));

// Statuses from src/lib/outreach.js: open = not Dropped / Closed / Partner; hot = meeting, date asked, workshop confirmed.
export function schoolsToFollow(schools, today) {
  return (schools ?? [])
    .filter((s) => isOpen(s) && (["overdue", "today", "soon"].includes(due(s.next_date, today)) || isHot(s)))
    .sort(byDue(today));
}

// Not paid, not do-not-contact, and due within a week or still open ("not interested" is closed).
export function leadsToFollow(leads, today) {
  return (leads ?? [])
    .filter((l) => !l.paid && !l.do_not_contact)
    .filter((l) => {
      const s = String(l.status ?? "").trim();
      return ["overdue", "today", "soon"].includes(due(l.next_date, today)) || !s || (/interested|call/i.test(s) && !/not interested/i.test(s));
    })
    .sort(byDue(today));
}

export function groupByTab(leads) {
  const groups = new Map();
  for (const l of leads) {
    const tab = l.tab || "Manual";
    groups.set(tab, [...(groups.get(tab) ?? []), l]);
  }
  // Website first (fresh inbound), then schools by name.
  return [...groups].sort(([a], [b]) => (a === "Website" ? -1 : b === "Website" ? 1 : a.localeCompare(b)));
}

export const isDueNow = (row, today) => ["overdue", "today"].includes(due(row.next_date, today));

// Indian mobile → 10 digits, or null.
export function mobile(phone) {
  const d = String(phone ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}
export const telLink = (phone) => (mobile(phone) ? `tel:+91${mobile(phone)}` : null);

export function waLink(phone, { name, student } = {}) {
  const m = mobile(phone);
  if (!m) return null;
  const first = (s) => String(s ?? "").trim().split(/\s+/)[0];
  const text = student
    ? `Namaskara! This is Chirag from Beyond Tatva, about ${first(student)}'s AI course. Is this a good time to talk?`
    : `Namaskara${first(name) ? ` ${first(name)}` : ""}! This is Chirag from Beyond Tatva (AI course for Grades 8–10). Is this a good time to talk?`;
  return `https://wa.me/91${m}?text=${encodeURIComponent(text)}`;
}
