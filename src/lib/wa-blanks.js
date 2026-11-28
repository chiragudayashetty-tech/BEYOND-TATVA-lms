// Shared by the Studio WhatsApp page (server) and its forms (browser): keep this file free of "use client".
// What can fill a template blank ({{1}}, {{2}}…). Values come from the LMS when the message is sent.
export const BLANKS = [
  ["{parent_name}", "Parent name"],
  ["{student_name}", "Child's full name"],
  ["{student_first}", "Child's first name"],
  ["{school}", "School"],
  ["{grade}", "Class"],
  ["{stage}", "Stage (Lead / Signed up / Paid)"],
];
export const blankLabel = (p) => BLANKS.find(([v]) => v === p)?.[1] ?? `"${p}"`;
