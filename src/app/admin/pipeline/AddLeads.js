"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, UserPlus } from "lucide-react";
import { addLead, importLeads } from "@/app/admin/actions";

const COLS = ["phone", "parent_name", "student_name", "grade", "school_name", "note"];

// "phone, parent, student, grade, school, note" per line; a header line is skipped. Quotes are optional.
export function parseLeads(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    .map((line) => line.split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((cells) => /\d{10}/.test(cells[0]?.replace(/\D/g, "") ?? ""))
    .map((cells) => Object.fromEntries(COLS.map((k, i) => [k, cells[i] || null])));
}

export default function AddLeads() {
  const [open, setOpen] = useState(null); // "one" | "many" | null
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(open === "one" ? null : "one")} className="btn-secondary min-h-11"><UserPlus size={16} /> Add a lead</button>
        <button type="button" onClick={() => setOpen(open === "many" ? null : "many")} className="btn-secondary min-h-11"><Upload size={16} /> Import leads</button>
      </div>
      {open === "one" && <AddOne />}
      {open === "many" && <ImportMany />}
    </div>
  );
}

function AddOne() {
  const [state, action, pending] = useActionState(addLead, null);
  return (
    <form action={action} className="card mt-3 grid gap-3 p-4 sm:grid-cols-2">
      <label><span className="label">Parent WhatsApp number *</span><input name="phone" required inputMode="tel" className="input" placeholder="98450 12345" /></label>
      <label><span className="label">Where from</span><select name="source" className="input" defaultValue="manual">
        {["manual", "phone", "walk-in", "school-visit", "fair", "referral"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      <label><span className="label">Parent name</span><input name="parent_name" maxLength={80} className="input" /></label>
      <label><span className="label">Student name</span><input name="student_name" maxLength={80} className="input" /></label>
      <label><span className="label">Class</span><input name="grade" type="number" min={1} max={12} className="input" /></label>
      <label><span className="label">School</span><input name="school_name" maxLength={120} className="input" /></label>
      <label className="sm:col-span-2"><span className="label">Note</span><input name="note" maxLength={500} className="input" placeholder="e.g. Called after the Udupi fair" /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary min-h-11">{pending ? "Saving…" : "Add lead"}</button>
        {state && <span role="status" className={`text-sm ${state.ok ? "text-muted" : "text-danger"}`}>{state.ok ? state.message : state.error}</span>}
      </div>
    </form>
  );
}

function ImportMany() {
  const [text, setText] = useState("");
  const [source, setSource] = useState("import");
  const [result, setResult] = useState(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const rows = parseLeads(text);
  const run = () => start(async () => {
    const res = await importLeads(rows, source.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "import");
    setResult(res); if (res.ok) { router.refresh(); setText(""); }
  });
  return (
    <div className="card mt-3 space-y-3 p-4">
      <p className="text-sm text-muted">Paste from Excel or Google Sheets, one person per line: <b>phone, parent name, student name, class, school, note</b>. Only the phone is required. A phone already imported from the same source counts once.</p>
      <textarea rows={6} className="input font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={"9845012345, Ravi, Anu, 9, SVS Udupi, met at fair\n9900011122, Meera, , 10"} />
      <label className="block max-w-xs"><span className="label">Source name</span><input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="fair-nov" /></label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || rows.length === 0} onClick={run} className="btn-primary min-h-11">{pending ? "Importing…" : `Import ${rows.length} lead${rows.length === 1 ? "" : "s"}`}</button>
        {result && (result.ok
          ? <span role="status" className="text-sm text-muted">{result.data.saved} added · {result.data.duplicate} already there{result.data.invalid.length ? ` · ${result.data.invalid.length} skipped (${result.data.invalid.slice(0, 3).map((x) => `line ${x.row}: ${x.error}`).join("; ")})` : ""}</span>
          : <span role="alert" className="text-sm text-danger">{result.error}</span>)}
      </div>
    </div>
  );
}
