"use client";

import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function parseLine(line) {
  const values = []; let value = "", quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += char;
  }
  values.push(value.trim()); return values;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseLine(lines.shift()).map((name) => name.toLowerCase().replace(/[^a-z]/g, ""));
  const col = (names) => headers.findIndex((name) => names.includes(name));
  const nameCol = col(["name", "studentname"]), gradeCol = col(["grade"]), phoneCol = col(["parentwhatsapp", "parentphone", "whatsapp"]), sectionCol = col(["section", "class"]);
  if ([nameCol, gradeCol, phoneCol].some((index) => index < 0)) throw new Error("CSV needs name, grade, and parent_whatsapp columns.");
  return lines.map((line) => { const cells = parseLine(line); return { name: cells[nameCol] ?? "", grade: Number(cells[gradeCol]), parent_phone: cells[phoneCol] ?? "", ...(sectionCol >= 0 && cells[sectionCol] ? { section: cells[sectionCol] } : {}) }; });
}

export default function RosterUpload({ schools, courseId, preview = false }) {
  const [school, setSchool] = useState(""); const [label, setLabel] = useState(""); const [rows, setRows] = useState([]);
  const [result, setResult] = useState([]); const [errors, setErrors] = useState([]); const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rowErrors = useMemo(() => rows.flatMap((row, index) => [
    !row.name.trim() && `Row ${index + 1}: add a student name.`,
    ![8, 9, 10].includes(row.grade) && `Row ${index + 1}: grade must be 8, 9, or 10.`,
    !/^\+?[0-9 ()-]{8,20}$/.test(row.parent_phone) && `Row ${index + 1}: check parent WhatsApp.`,
  ].filter(Boolean)), [rows]);

  async function chooseFile(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    setError(""); setErrors([]); setRows([]); setResult([]);
    if (!file) return;
    try { const parsed = parseCsv(await file.text()); if (!parsed.length) throw new Error("Add at least one student row below the header."); setRows(parsed); }
    catch (err) { setError(err.message || "Could not read this CSV file."); }
  }

  async function save() {
    setBusy(true); setErrors([]); setError("");
    const { data, error: rpcError } = await createClient().rpc("admin_bulk_enroll", { p_school: school, p_course: courseId, p_label: label.trim(), p_rows: rows });
    setBusy(false);
    if (rpcError) return setError(rpcError.message);
    if (!data?.ok) return setErrors((data?.errors ?? []).map((item) => `Row ${item.row}: ${item.error}`));
    setResult(data.keys ?? []);
    setRows([]); // stop a second tap creating the same keys again
  }

  function download() {
    const csv = ["Student name,Class,Access key", ...result.map((row) => [row.name, row.class, row.code].map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "school-student-keys.csv" }); link.click(); URL.revokeObjectURL(url);
  }

  return <section className="mt-5 space-y-3 border-t border-border pt-5">
    <h3 className="font-semibold">Upload class list</h3>
    <p className="text-sm text-muted">Choose a CSV with name, grade, parent_whatsapp, and optional section columns. Up to 200 students. Classes are made from grade + section (e.g. Grade 9 A).</p>
    <label className="block"><span className="label">School</span><select className="input" value={school} onChange={(event) => setSchool(event.target.value)}><option value="">Choose school</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="block"><span className="label">Batch label (optional)</span><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Udupi Public 2026" /></label>
    <label className="btn-secondary min-h-11 cursor-pointer"><Upload size={16} /> Choose CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={chooseFile} /></label>
    {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {rows.length > 0 && <>
      <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="bg-surface-2"><th className="p-2">Name</th><th className="p-2">Grade</th><th className="p-2">Parent WhatsApp</th><th className="p-2">Section</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-border"><td className="p-2">{row.name}</td><td className="p-2">{row.grade || "–"}</td><td className="p-2">{row.parent_phone}</td><td className="p-2">{row.section || "–"}</td></tr>)}</tbody></table></div>
      <p className="text-xs text-muted">{rows.length} students to check. CSV row numbers below start at 1.</p>
    </>}
    {rows.length > 200 && <p role="alert" className="text-sm text-danger">Split this list into files with 200 students or fewer.</p>}
    {[...rowErrors, ...errors].map((message, index) => <p key={`${index}-${message}`} role="alert" className="text-sm text-danger">{message}</p>)}
    {rows.length > 0 && <button type="button" disabled={busy || preview || rowErrors.length > 0 || rows.length > 200 || !school} onClick={save} className="btn-primary w-full">{busy ? "Creating keys…" : preview ? "Saving is unavailable in preview" : "Create keys"}</button>}
    {result.length > 0 && <div className="rounded-xl bg-success-soft p-3"><p className="text-sm font-medium">{result.length} keys created.</p><button type="button" onClick={download} className="btn-secondary mt-2 min-h-11"><Download size={16} /> Download CSV</button></div>}
  </section>;
}
