"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, FileText, ImagePlus, MessageSquareText, Send, X } from "lucide-react";
import { Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
const safeName = (n) => n.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "file";

export default function HandIn({ assignment: a, moduleLabel, submission: sub, files: existing, userId }) {
  const router = useRouter();
  const locked = sub?.status === "graded";
  const [text, setText] = useState(sub?.text_answer ?? "");
  const [link, setLink] = useState(sub?.link_url ?? "");
  const [kept, setKept] = useState(existing); // already uploaded
  const [added, setAdded] = useState([]); // File objects to upload
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function pick(e) {
    setError("");
    const list = [...e.target.files];
    e.target.value = "";
    const tooBig = list.find((f) => f.size > MAX_BYTES);
    if (tooBig) return setError(`${tooBig.name} is over 10 MB. Take the photo at a lower size, or split the PDF.`);
    if (kept.length + added.length + list.length > MAX_FILES) return setError(`Up to ${MAX_FILES} files.`);
    setAdded((x) => [...x, ...list]);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    try {
      const uploaded = [];
      for (const f of added) {
        const path = `${userId}/${a.id}/${Date.now()}-${safeName(f.name)}`;
        const { error } = await supabase.storage.from("submissions").upload(path, f, { contentType: f.type || undefined, upsert: false });
        if (error) throw new Error(/mime|type/i.test(error.message) ? `${f.name}: only photos (JPG, PNG, HEIC) and PDFs` : `Upload failed for ${f.name}. Check your internet and try again.`);
        uploaded.push(path);
      }
      const { error } = await supabase.rpc("submit_assignment", {
        p_assignment: a.id, p_text: a.allow_text ? text : null, p_link: a.allow_link ? link : null, p_files: [...kept.map((k) => k.path), ...uploaded],
      });
      if (error) throw new Error(error.message);
      setAdded([]);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card p-5 sm:p-6">
        {moduleLabel && <div className="text-xs font-semibold uppercase tracking-wider text-primary">{moduleLabel}</div>}
        <h1 className="mt-1 text-2xl font-semibold">{a.title}</h1>
        <div className="mt-1 text-sm text-muted">
          Out of {a.max_marks}
          {a.due_at && ` · due ${new Date(a.due_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}`}
        </div>
        {a.instructions && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{a.instructions}</p>}
      </div>

      {sub && sub.status !== "submitted" && (
        <div className={`card p-5 ${sub.status === "graded" ? "border-success/40 bg-success-soft" : "border-warning/40 bg-warning-soft"}`}>
          <div className="flex items-center gap-2 font-semibold">
            <MessageSquareText className="h-5 w-5" />
            {sub.status === "graded" ? <>Marked: {sub.marks}/{a.max_marks}</> : "Sent back: please improve it and hand in again"}
          </div>
          {sub.feedback && <p className="mt-2 whitespace-pre-wrap text-sm">{sub.feedback}</p>}
        </div>
      )}

      <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Your work</h2>
          {sub && <Badge tone={sub.status === "graded" ? "success" : sub.status === "returned" ? "warning" : "neutral"}>{sub.status === "submitted" ? "Handed in" : sub.status === "graded" ? "Marked" : "Redo"}</Badge>}
        </div>
        {a.allow_text && (
          <label className="block"><span className="label">Your answer</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={5000} disabled={locked} className="input resize-y leading-relaxed" placeholder="Write your answer here" /></label>
        )}
        {a.allow_link && (
          <label className="block"><span className="label">Link</span>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} disabled={locked} className="input" placeholder="https://… (Canva, Google Doc, your chatbot)" /></label>
        )}
        {a.allow_files && (
          <div>
            <span className="label">Photos or PDF</span>
            <div className="flex flex-wrap gap-2">
              {kept.map((f) => (
                <span key={f.path} className="chip bg-surface-2 text-muted">
                  <FileText className="h-3.5 w-3.5" /><a href={f.url} target="_blank" rel="noopener noreferrer" className="max-w-40 truncate hover:underline">{f.path.split("/").pop()}</a>
                  {!locked && <button type="button" onClick={() => setKept((k) => k.filter((x) => x.path !== f.path))} aria-label="Remove"><X className="h-3.5 w-3.5" /></button>}
                </span>
              ))}
              {added.map((f, i) => (
                <span key={i} className="chip bg-primary-soft text-primary">
                  <FileText className="h-3.5 w-3.5" /><span className="max-w-40 truncate">{f.name}</span>
                  <button type="button" onClick={() => setAdded((x) => x.filter((_, j) => j !== i))} aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
            {!locked && kept.length + added.length < MAX_FILES && (
              <label className="btn-secondary mt-2 cursor-pointer"><ImagePlus className="h-4 w-4" /> Add photo or PDF
                <input type="file" accept={ACCEPT} multiple onChange={pick} className="sr-only" /></label>
            )}
            <p className="mt-1 text-xs text-muted">Up to {MAX_FILES} files, 10 MB each. Only you and your teachers can see them.</p>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {done && !error && <p role="status" className="flex items-center gap-1.5 text-sm text-success"><CircleCheck className="h-4 w-4" /> Handed in. You can still change it until it&apos;s marked.</p>}
        {!locked && <button disabled={busy} className="btn-primary w-full"><Send className="h-4 w-4" /> {busy ? "Handing in…" : sub ? "Update my work" : "Hand in"}</button>}
      </form>
    </div>
  );
}
