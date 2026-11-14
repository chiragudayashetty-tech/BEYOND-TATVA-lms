// School outreach statuses: the same words as the School Outreach sheet (Chirag, 2026-11-14).
// "Workshop Status" (sales pipeline) and "After-workshop Status" (once the workshop has happened).
// "Workshop done" also makes the Sheets sync open a lead tab for the school.
export const OUTREACH_STATUSES = ["Not contacted", "Called", "Meeting", "Date requested", "Visited", "Workshop confirmed", "Workshop done", "On hold", "Later", "Referral", "Dropped"];
export const AFTER_STATUSES = ["Following up", "Partner", "Closed"];

// Old words (before 2026-11-14) still read correctly.
const OLD = { "Meeting set": "Meeting", "Workshop booked": "Workshop confirmed", "Not interested": "Dropped", "Proposal sent": "Date requested", Partner: "Workshop done" };
export const normalStatus = (s) => OLD[s] ?? s;

// Sales is still going on for this school (Today page, due badges). Dropped / Closed / Partner are not.
export const isOpen = (s) => !/^(dropped|not interested)$/i.test(s?.status ?? "") && !/^(closed|partner)$/i.test(s?.after_status ?? "");
// Worth a nudge even without a date.
export const isHot = (s) => /^(meeting|meeting set|date requested|workshop confirmed|workshop booked)$/i.test(s?.status ?? "") || /^following up$/i.test(s?.after_status ?? "");

export const statusTone = (s) =>
  ({ "Workshop done": "success", "Workshop confirmed": "primary", "Date requested": "primary", Meeting: "primary", Visited: "warning", Called: "warning",
     "On hold": "neutral", Later: "neutral", Dropped: "danger", Partner: "success", Closed: "neutral", "Following up": "warning" })[normalStatus(s)] ?? "neutral";

// Today in India as YYYY-MM-DD, to compare with next_date.
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
