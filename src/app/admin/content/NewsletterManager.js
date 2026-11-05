"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX = 25 * 1024 * 1024;
const safeName = (n) => n.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";

// Studio: upload the monthly newsletter (released on the 1st Sunday). Enrolled students see it in their Study Kit.
// Files go to the private 'newsletters' bucket at {yyyy-mm}/…
export default function NewsletterManager({ issues = [], defaultDate }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setError("");
    if (!TYPES.includes(file.type)) return setError(`${file.name}: choose a PDF, JPG, PNG or WebP file.`);
    if (file.size > MAX) return setError(`${file.name} is over 25 MB.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Pick the issue date.");
    setBusy(true);
    const supabase = createClient();
    const path = `${date.slice(0, 7)}/${Date.now()}-${safeName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("newsletters").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { setBusy(false); return setError(`Upload failed: ${upErr.message}`); }
    const label = new Date(`${date}T00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const { error: rowErr } = await supabase.from("newsletters").insert({
      title: (title.trim() || `AI Newsletter · ${label}`).slice(0, 120), issue_date: date, file_path: path, mime: file.type, size_bytes: file.size,
    });
    if (rowErr) { await supabase.storage.from("newsletters").remove([path]); setBusy(false); return setError(`Could not save: ${rowErr.message}`); }
    setTitle(""); setBusy(false); router.refresh();
  }

  async function remove(n) {
    setError("");
    const supabase = createClient();
    const { error: rowErr } = await supabase.from("newsletters").delete().eq("id", n.id);
    if (rowErr) return setError(rowErr.message);
    await supabase.storage.from("newsletters").remove([n.file_path]);
    router.refresh();
  }

  return (
    <section className="card mb-6 p-5">
      <div className="mb-1 flex items-center gap-2 font-semibold"><Newspaper className="h-5 w-5 text-primary" /> Monthly newsletter</div>
      <p className="mb-4 text-sm text-muted">Upload each issue for the 1st Sunday of the month. Enrolled students see it in their Study Kit straight away.</p>
      <ul className="mb-3 space-y-2">
        {issues.map((n) => (
          <li key={n.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 pl-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{n.title} <span className="text-muted">· {n.issue_date}</span></span>
            {n.view && <a href={n.view} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-3">View</a>}
            <button type="button" onClick={() => remove(n)} aria-label={`Delete ${n.title}`} className="btn-ghost min-h-11 px-3 text-danger"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {!issues.length && <li className="text-sm text-muted">No issues yet.</li>}
      </ul>
      <div className="flex flex-wrap gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Issue date" className="input w-auto" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title (optional)" aria-label="Newsletter title" className="input min-w-0 flex-1 basis-48" />
        <label className={`btn-secondary min-h-11 cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload issue"}
          <input type="file" accept={TYPES.join(",")} onChange={upload} className="sr-only" />
        </label>
      </div>
      {error && <p role="alert" className="mt-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
