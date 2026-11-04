"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX = 25 * 1024 * 1024;
const safeName = (n) => n.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";

// Studio: attach PDFs or images to a module. Files go to the private 'module-resources' bucket at {module id}/…
export default function ResourceManager({ chapterId, files = [] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setError("");
    if (!TYPES.includes(file.type)) return setError(`${file.name}: choose a PDF, JPG, PNG or WebP file.`);
    if (file.size > MAX) return setError(`${file.name} is over 25 MB.`);
    setBusy(true);
    const supabase = createClient();
    const path = `${chapterId}/${Date.now()}-${safeName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("module-resources").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) { setBusy(false); return setError(`Upload failed: ${upErr.message}`); }
    const { error: rowErr } = await supabase.from("module_resources").insert({
      chapter_id: chapterId, title: (title.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0, 120),
      file_path: path, mime: file.type, size_bytes: file.size, position: files.length,
    });
    if (rowErr) { await supabase.storage.from("module-resources").remove([path]); setBusy(false); return setError(`Could not save: ${rowErr.message}`); }
    setTitle(""); setBusy(false); router.refresh();
  }

  async function remove(f) {
    setError("");
    const supabase = createClient();
    const { error: rowErr } = await supabase.from("module_resources").delete().eq("id", f.id);
    if (rowErr) return setError(rowErr.message);
    await supabase.storage.from("module-resources").remove([f.file_path]);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-2 text-sm font-semibold">Attachments (PDF or image, up to 25 MB)</div>
      <ul className="mb-2 space-y-2">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 pl-3 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{f.title}</span>
            {f.view && <a href={f.view} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-3">View</a>}
            <button type="button" onClick={() => remove(f)} aria-label={`Delete ${f.title}`} className="btn-ghost min-h-11 px-3 text-danger"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {!files.length && <li className="text-sm text-muted">No attachments yet. Students see them under this module once it is open to them.</li>}
      </ul>
      <div className="flex flex-wrap gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title (optional, e.g. Worksheet)" aria-label="Attachment title" className="input min-w-0 flex-1 basis-48" />
        <label className={`btn-secondary min-h-11 cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload file"}
          <input type="file" accept={TYPES.join(",")} onChange={upload} className="sr-only" />
        </label>
      </div>
      {error && <p role="alert" className="mt-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
