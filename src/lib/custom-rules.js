// Studio → WhatsApp → Your rules: helpers shared by the form, the list and tests. Dependency-free.

export const TRIGGERS = [
  ["signup", "After someone signs up"],
  ["access", "After someone gets the course"],
  ["module_open", "When a module opens for a student"],
  ["lead_added", "After a new lead is added (no account yet)"],
  ["date", "On a fixed date and time"],
];
export const STAGES = [["any", "Anyone"], ["not_enrolled", "Not enrolled yet"], ["enrolled", "Enrolled"]];
export const M0 = [["", "Any"], ["none", "Not started Module 0"], ["part", "Part-way through Module 0"], ["watched", "Watched, quiz/PDF left"], ["done", "Module 0 done"]];
export const UNITS = [["minutes", 1], ["hours", 60], ["days", 1440]];

// 130 minutes → { amount: 130, unit: "minutes" }; 2880 → { amount: 2, unit: "days" }
export function splitDelay(minutes) {
  const m = Math.max(0, Number(minutes) || 0);
  if (m && m % 1440 === 0) return { amount: m / 1440, unit: "days" };
  if (m && m % 60 === 0) return { amount: m / 60, unit: "hours" };
  return { amount: m, unit: "minutes" };
}
export const joinDelay = (amount, unit) => Math.min(525600, Math.max(0, Math.round(Number(amount) || 0) * (UNITS.find(([u]) => u === unit)?.[1] ?? 1)));

// <input type="datetime-local"> has no zone: it is India time. "2026-12-01T18:30" ⇄ ISO with +05:30.
export const istToIso = (local) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local ?? "") ? `${local}:00+05:30` : null);
export function isoToIst(iso) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 330 * 60_000);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}

const hour = (h) => `${h % 12 || 12}${h < 12 || h === 24 ? "am" : "pm"}`;
const delayText = (m) => { const { amount, unit } = splitDelay(m); return amount ? `${amount} ${amount === 1 ? unit.slice(0, -1) : unit} after` : "right after"; };

// One plain sentence: "Parent: 2 days after someone signs up (not enrolled yet, Class 9), 9am–9pm."
export function describeRule(r, schoolName = "") {
  const who = [
    r.aud_stage === "not_enrolled" && "not enrolled yet", r.aud_stage === "enrolled" && "enrolled",
    r.aud_school && (schoolName || "one school"), r.aud_grade && `Class ${r.aud_grade}`,
    r.aud_m0 && M0.find(([v]) => v === r.aud_m0)?.[1].toLowerCase(),
  ].filter(Boolean).join(", ");
  const window = `${hour(r.from_hour ?? 9)}–${hour(r.to_hour ?? 21)}`;
  const to = r.recipient === "student" ? "Student" : "Parent";
  const when = {
    signup: `${delayText(r.delay_minutes)} someone signs up`,
    access: `${delayText(r.delay_minutes)} someone gets the course`,
    module_open: `${delayText(r.delay_minutes)} ${r.aud_module ? `Module ${r.aud_module}` : "a module"} opens for a student`,
    lead_added: `${delayText(r.delay_minutes)} a new lead is added`,
    date: `on ${r.run_at ? new Date(r.run_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "…"}`,
  }[r.trigger] ?? "";
  return `${to}: ${when}${who ? ` (${who})` : ""}, sent ${window}.`;
}
