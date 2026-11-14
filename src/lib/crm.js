// Studio CRM filters (Pipeline, Today). Pure helpers, tested in tests/crm.test.mjs.
// Rows come from admin_pipeline: school, grade, section, source, outcome (open|won|lost|dnc), next_date, siblings.

export const OUTCOMES = [
  { id: "open", label: "Open", tone: "primary" },
  { id: "won", label: "Won", tone: "success" },
  { id: "lost", label: "Lost", tone: "neutral" },
  { id: "dnc", label: "Do not contact", tone: "danger" },
];

// Same rule as public.lead_outcome() in the database (20261114000005).
export function leadOutcome(status, paid = false, dnc = false) {
  const s = String(status ?? "");
  if (paid || /enrolled/i.test(s)) return "won";
  if (dnc) return "dnc";
  if (/(closed|not interested)/i.test(s)) return "lost";
  return "open";
}

const one = (v) => (Array.isArray(v) ? v[0] : v);
const clean = (v) => { const s = String(one(v) ?? "").trim(); return s ? s.slice(0, 120) : null; };
export const NO_SCHOOL = "(no school)";
export const schoolOf = (r) => String(r.school ?? "").trim() || NO_SCHOOL;
const same = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// URL search params → filters. Unknown values are ignored, so a bad link just shows more.
export function parseFilters(sp = {}) {
  const outcome = clean(sp.status);
  return {
    school: clean(sp.school),
    grade: /^\d{1,2}$/.test(clean(sp.class) ?? "") ? Number(clean(sp.class)) : null,
    section: clean(sp.section),
    outcome: OUTCOMES.some((o) => o.id === outcome) ? outcome : null,
    source: clean(sp.source),
    siblings: clean(sp.siblings) === "1",
    due: clean(sp.due) === "1",
    q: clean(sp.q),
    group: clean(sp.group) === "school" ? "school" : null,
  };
}

// Back to a query string (only what is set), e.g. for links that change one filter.
export function filterQuery(f, change = {}) {
  const v = { ...f, ...change };
  const p = [];
  if (v.school) p.push(["school", v.school]);
  if (v.grade) p.push(["class", v.grade]);
  if (v.section) p.push(["section", v.section]);
  if (v.outcome) p.push(["status", v.outcome]);
  if (v.source) p.push(["source", v.source]);
  if (v.siblings) p.push(["siblings", "1"]);
  if (v.due) p.push(["due", "1"]);
  if (v.q) p.push(["q", v.q]);
  if (v.group) p.push(["group", v.group]);
  return p.map(([k, x]) => `${k}=${encodeURIComponent(x)}`).join("&");
}

export const isDueRow = (r, today) => Boolean(r.next_date) && r.next_date <= today && (r.outcome ?? "open") === "open";

export function applyFilters(rows, f, today, extraDue = () => false) {
  const q = f.q?.toLowerCase();
  const digits = f.q?.replace(/\D/g, "");
  return (rows ?? []).filter((r) =>
    (!f.school || same(schoolOf(r), f.school)) &&
    (!f.grade || Number(r.grade) === f.grade) &&
    (!f.section || same(r.section, f.section)) &&
    (!f.outcome || (r.outcome ?? "open") === f.outcome) &&
    (!f.source || same(r.source, f.source)) &&
    (!f.siblings || Boolean(r.siblings)) &&
    (!f.due || isDueRow(r, today) || extraDue(r)) &&
    (!q || String(r.name ?? "").toLowerCase().includes(q) || String(r.parent_name ?? "").toLowerCase().includes(q) ||
      (digits?.length >= 4 && String(r.phone ?? "").replace(/\D/g, "").includes(digits))));
}

// Siblings next to each other (same phone), then newest first.
export function sortRows(rows) {
  const t = (r) => new Date(r.signed_up_at ?? r.lead_at ?? 0).getTime();
  const newest = new Map();
  for (const r of rows) newest.set(r.phone, Math.max(newest.get(r.phone) ?? 0, t(r)));
  return [...rows].sort((a, b) => (newest.get(b.phone) - newest.get(a.phone)) || String(a.phone).localeCompare(String(b.phone)) || String(a.name).localeCompare(String(b.name)));
}

const tally = (rows) => {
  const c = { total: rows.length, open: 0, won: 0, lost: 0, dnc: 0 };
  for (const r of rows) c[r.outcome ?? "open"] = (c[r.outcome ?? "open"] ?? 0) + 1;
  c.conversion = c.total ? c.won / c.total : 0;
  return c;
};

// One card per school, biggest first ("(no school)" last).
export function groupBySchool(rows) {
  // Case-insensitive ("SRVK" = "srvk"); the first spelling seen is shown.
  const m = new Map();
  for (const r of rows) {
    const k = schoolOf(r).toLowerCase();
    const g = m.get(k) ?? { school: schoolOf(r), rs: [] };
    g.rs.push(r);
    m.set(k, g);
  }
  return [...m.values()].map(({ school, rs }) => ({ school, ...tally(rs) }))
    .sort((a, b) => (a.school === NO_SCHOOL) - (b.school === NO_SCHOOL) || b.total - a.total || a.school.localeCompare(b.school));
}

// Class → section counts inside one school.
export function classSections(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = `${r.grade ?? "?"}|${String(r.section ?? "").trim().toUpperCase() || "–"}`;
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return [...m].map(([k, rs]) => { const [grade, section] = k.split("|"); return { grade, section, ...tally(rs) }; })
    .sort((a, b) => String(a.grade).localeCompare(String(b.grade), "en", { numeric: true }) || a.section.localeCompare(b.section));
}

// Choices for the filter dropdowns, from the rows themselves (new schools/sections appear on their own).
export function facets(rows) {
  const uniq = (fn) => [...new Set((rows ?? []).map(fn).filter((x) => x !== null && x !== undefined && String(x).trim() !== ""))];
  return {
    schools: groupBySchool(rows ?? []).map((g) => g.school).sort((a, b) => (a === NO_SCHOOL) - (b === NO_SCHOOL) || a.localeCompare(b)),
    grades: uniq((r) => r.grade).map(Number).sort((a, b) => a - b),
    sections: uniq((r) => String(r.section ?? "").trim().toUpperCase()).sort(),
    sources: uniq((r) => r.source).sort(),
  };
}
