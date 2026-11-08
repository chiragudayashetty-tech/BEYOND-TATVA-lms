"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Empty } from "@/components/ui";

const fields = [
  ["full_name", "Student"], ["school", "School"], ["grade", "Grade"], ["score", "Score"],
  ["lessons_completed", "Lessons"], ["quiz_avg_best_pct", "Quiz avg"], ["quizzes_passed", "Quizzes passed"],
  ["resources_opened", "PDFs opened"], ["assignments_submitted", "Assignments"], ["active_days_30", "Active days (30d)"], ["last_active", "Last active"], ["paid", "Paid"],
];

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = Object.assign(document.createElement("a"), { href: url, download: filename });
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudentTable({ students, schoolOptions = [], initialSchool = "", inactiveCutoff }) {
  const [search, setSearch] = useState("");
  const [school, setSchool] = useState(initialSchool);
  const [grade, setGrade] = useState("");
  const [paid, setPaid] = useState("");
  const [inactive, setInactive] = useState(false);
  const [sort, setSort] = useState(["score", "desc"]);
  const rows = useMemo(() => students.filter((student) => {
    const term = search.trim().toLowerCase();
    return (!term || `${student.full_name} ${student.school ?? ""} ${student.grade ?? ""}`.toLowerCase().includes(term))
      && (!school || (school === "none" ? !student.school_id : student.school_id === school))
      && (!grade || String(student.grade ?? "") === grade)
      && (paid === "" || Boolean(student.paid) === (paid === "paid"))
      && (!inactive || !student.last_active || student.last_active <= inactiveCutoff);
  }).sort((a, b) => {
    const [key, direction] = sort;
    const av = a[key] ?? ""; const bv = b[key] ?? "";
    return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * (direction === "asc" ? 1 : -1);
  }), [students, search, school, grade, paid, inactive, inactiveCutoff, sort]);

  const csvRows = rows.map((student) => [student.full_name, student.school, student.grade, student.score,
    `${student.lessons_completed}/${student.lessons_total}`, student.quiz_avg_best_pct, student.quizzes_passed,
    student.resources_opened, `${student.assignments_submitted}/${student.assignments_total}`, student.active_days_30,
    student.last_active, student.paid ? "Paid" : "Unpaid"]);

  return <>
    <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <input className="input" aria-label="Search students" placeholder="Search name or school" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select className="input" aria-label="Filter by school" value={school} onChange={(e) => setSchool(e.target.value)}><option value="">All schools</option>{schoolOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
      <select className="input" aria-label="Filter by grade" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">All grades</option>{[8, 9, 10].map((value) => <option key={value}>{value}</option>)}</select>
      <select className="input" aria-label="Filter by payment" value={paid} onChange={(e) => setPaid(e.target.value)}><option value="">Paid + unpaid</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} />Inactive 14+ days</label>
      <button className="btn-secondary sm:col-span-2 xl:col-span-5" type="button" onClick={() => downloadCsv("student-analytics.csv", [["Name", "School", "Grade", "Score", "Lessons", "Quiz avg %", "Quizzes passed", "PDFs opened", "Assignments", "Active days 30d", "Last active", "Paid"], ...csvRows])}>Download CSV ({rows.length})</button>
    </div>
    {rows.length === 0 ? <Empty title="No students match" body="Try changing or clearing your filters." /> : <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[1100px] text-left text-sm">
      <thead className="bg-surface-2 text-xs text-muted"><tr>{fields.map(([key, label]) => <th key={key} className="whitespace-nowrap px-3 py-3"><button type="button" onClick={() => setSort(([current, direction]) => [key, current === key && direction === "asc" ? "desc" : "asc"])}>{label}{sort[0] === key ? (sort[1] === "asc" ? " ↑" : " ↓") : ""}</button></th>)}</tr></thead>
      <tbody className="divide-y divide-border">{rows.map((student) => <tr key={student.student_id} className="hover:bg-surface-2/60">
        <td className="px-3 py-3 font-medium"><Link className="text-primary hover:underline" href={`/admin/analytics/students/${student.student_id}`}>{student.full_name || "Student"}</Link></td>
        <td className="px-3 py-3">{student.school || "–"}</td><td className="px-3 py-3">{student.grade ? `Grade ${student.grade}` : "–"}</td>
        <td className="px-3 py-3"><Badge tone={student.score >= 70 ? "success" : student.score >= 40 ? "warning" : "danger"}>{student.score ?? "–"}</Badge></td>
        <td className="px-3 py-3">{student.lessons_completed ?? 0}/{student.lessons_total ?? 0}</td><td className="px-3 py-3">{student.quiz_avg_best_pct == null ? <span title="No published quizzes are available">–</span> : `${student.quiz_avg_best_pct}%`}</td>
        <td className="px-3 py-3">{student.quizzes_passed ?? 0}</td><td className="px-3 py-3">{student.resources_opened ?? 0}</td><td className="px-3 py-3">{student.assignments_submitted ?? 0}/{student.assignments_total ?? 0}</td>
        <td className="px-3 py-3">{student.active_days_30 ?? 0}</td><td className="px-3 py-3">{student.last_active || <span title="No tracked learning activity yet">–</span>}</td><td className="px-3 py-3"><Badge tone={student.paid ? "success" : "neutral"}>{student.paid ? "Paid" : "Unpaid"}</Badge></td>
      </tr>)}</tbody>
    </table></div>}
  </>;
}
