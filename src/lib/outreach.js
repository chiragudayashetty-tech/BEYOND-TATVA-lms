// School outreach statuses, in pipeline order. "Workshop done" also makes the Sheets sync open a lead tab for the school.
export const OUTREACH_STATUSES = ["Not contacted", "Called", "Meeting set", "Visited", "Proposal sent", "Workshop booked", "Workshop done", "Partner", "Not interested"];

export const statusTone = (s) =>
  ({ Partner: "success", "Workshop done": "success", "Workshop booked": "primary", "Proposal sent": "primary", "Meeting set": "primary", Visited: "warning", Called: "warning", "Not interested": "danger" })[s] ?? "neutral";

// Today in India as YYYY-MM-DD, to compare with next_date.
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
