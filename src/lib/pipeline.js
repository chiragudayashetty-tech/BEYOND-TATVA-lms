// Funnel stages shown in Studio → Pipeline (computed by the admin_pipeline database function).
export const STAGES = [
  { id: 1, label: "Lead", body: "Gave details on the website, never signed in", tone: "neutral" },
  { id: 2, label: "Signed in", body: "Has an account, Module 0 not started", tone: "primary" },
  { id: 3, label: "Started", body: "Watching Module 0, not finished", tone: "warning" },
  { id: 4, label: "Finished Module 0", body: "Watched Module 0, not bought", tone: "primary" },
  { id: 5, label: "Bought", body: "Has full course access", tone: "success" },
];
export const STALL_HOURS = 24;

const cell = (v) => {
  const s = v == null ? "" : String(v);
  // Quote everything; neutralise spreadsheet formulas (but keep phone numbers like +9198… as they are).
  return `"${(/^[=@]|^[+-](?!\d+$)/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

export function toCsv(rows) {
  const cols = ["stage", "stalled", "name", "parent_name", "phone", "grade", "school", "source", "lead_at", "signed_up_at", "last_watch_at", "seconds_watched", "module0_done_at", "bought_at"];
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(c === "stage" ? STAGES[r.stage - 1]?.label : r[c])).join(","))].join("\n");
}
