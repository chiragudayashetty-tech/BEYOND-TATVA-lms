"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";

export function MonthPicker({ month }) {
  const router = useRouter();
  return <label className="flex min-h-11 items-center gap-2 text-sm text-muted">Month
    <input aria-label="Choose month" type="month" value={month} onChange={(event) => router.push(`/admin/reconcile?month=${event.target.value}`)} className="input min-h-11 w-auto" />
  </label>;
}

export function DownloadCsv({ month, rows }) {
  function download() {
    const columns = ["reference", "created_at_ist", "source", "status", "student_name", "email", "phone", "parent_name", "amount_paise", "claimed_by", "matched_by"];
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [columns, ...rows.map((row) => [
      row.reference,
      new Date(row.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      row.source,
      row.status,
      row.student_name,
      row.email,
      row.phone,
      row.parent_name,
      row.amount_paise,
      row.claimed_by,
      row.matched_by,
    ])].map((line) => line.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${lines}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `payments-${month}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <button type="button" onClick={download} className="btn-secondary min-h-11 px-3"><Download className="h-4 w-4" /> Download CSV</button>;
}
