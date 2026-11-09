"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CircleCheck, FileText, ImagePlus, MessageSquareText, Send, X } from "lucide-react";
import { Badge } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
const ACCEPTED_TYPES = new Set(ACCEPT.split(","));
const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"]);
const safeName = (n) => n.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "file";

export default function HandIn({ assignment: a, moduleLabel, submission: sub, files: existing, userId }) {
  const router = useRouter();
  const locked = sub?.status === "graded";
  const [text, setText] = useState(sub?.text_answer ?? "");
  const [link, setLink] = useState(sub?.link_url ?? "");
  const [kept, setKept] = useState(existing); // already uploaded
  const [added, setAdded] = useState([]); // File objects to upload
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const previews = useRef(new Map());
  const uploadedPaths = useRef(new Map()); // File -> storage path, so "Try again" doesn't upload twice
  const [previewSources, setPreviewSources] = useState({});

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function pick(e) {
    setError("");
    const list = [...e.target.files];
    e.target.value = "";
    const wrongType = list.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return file.type ? !ACCEPTED_TYPES.has(file.type) : !ACCEPTED_EXTENSIONS.has(extension);
    });
    if (wrongType) return setError(`${wrongType.name}: choose a JPG, PNG, WebP, HEIC, HEIF, or PDF file.`);
    const tooBig = list.find((f) => f.size > MAX_BYTES);
    if (tooBig) return setError(`${tooBig.name} is over 10 MB. Choose a smaller photo or PDF.`);
    if (kept.length + added.length + list.length > MAX_FILES) return setError(`You can attach up to ${MAX_FILES} files.`);
    const imageFiles = list.filter((file) => file.type.startsWith("image/"));
    imageFiles.forEach((file) => previews.current.set(file, URL.createObjectURL(file)));
    if (imageFiles.length) setPreviewSources((sources) => ({ ...sources, ...Object.fromEntries(imageFiles.map((file) => [file.name + file.lastModified, previews.current.get(file)])) }));
    setAdded((x) => [...x, ...list]);
  }

  function removeAdded(file) {
    const url = previews.current.get(file);
    if (url) URL.revokeObjectURL(url);
    previews.current.delete(file);
    setPreviewSources((sources) => {
      const next = { ...sources };
      delete next[file.name + file.lastModified];
      return next;
    });
    setAdded((files) => files.filter((item) => item !== file));
  }

  async function submit(e) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    setDone(false);
    const supabase = createClient();
    try {
      const uploaded = [];
      for (const [index, f] of added.entries()) {
        if (uploadedPaths.current.has(f)) { uploaded.push(uploadedPaths.current.get(f)); continue; }
        setUploadProgress(`Uploading file ${index + 1} of ${added.length}…`);
        const path = `${userId}/${a.id}/${Date.now()}-${safeName(f.name)}`;
        const { error } = await supabase.storage.from("submissions").upload(path, f, { contentType: f.type || undefined, upsert: false });
        if (error) throw new Error(/mime|type/i.test(error.message) ? `${f.name}: choose a JPG, PNG, WebP, HEIC, HEIF, or PDF file.` : `Upload failed for ${f.name}. Check your internet and try again.`);
        uploadedPaths.current.set(f, path);
        uploaded.push(path);
      }
      setUploadProgress("Saving your work…");
      const { error } = await supabase.rpc("submit_assignment", {
        p_assignment: a.id, p_text: a.allow_text ? text : null, p_link: a.allow_link ? link : null, p_files: [...kept.map((k) => k.path), ...uploaded],
      });
      if (error) throw new Error(error.message);
      // Files the student took out of this hand-in: delete them so they don't use up the upload limit.
      const keptPaths = new Set(kept.map((k) => k.path));
      const dropped = existing.map((k) => k.path).filter((path) => !keptPaths.has(path));
      if (dropped.length) await supabase.storage.from("submissions").remove(dropped);
      setAdded([]);
      uploadedPaths.current.clear();
      previews.current.forEach((url) => URL.revokeObjectURL(url));
      previews.current.clear();
      setPreviewSources({});
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setUploadProgress(null);
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
                  {!locked && <button type="button" onClick={() => setKept((k) => k.filter((x) => x.path !== f.path))} aria-label={`Remove ${f.path.split("/").pop()}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"><X className="h-4 w-4" /></button>}
                </span>
              ))}
              {added.map((f, i) => (
                <div key={`${f.name}-${f.lastModified}-${i}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-primary-soft p-2 text-primary">
                  {previewSources[f.name + f.lastModified]
                    ? <Image src={previewSources[f.name + f.lastModified]} alt={`Preview of ${f.name}`} width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    : <FileText className="ml-2 h-5 w-5 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                  <button type="button" onClick={() => removeAdded(f)} aria-label={`Remove ${f.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-primary/10"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            {!locked && kept.length + added.length < MAX_FILES && (
              <label className="btn-secondary mt-2 cursor-pointer"><ImagePlus className="h-4 w-4" /> Add photo or PDF
                <input type="file" accept={ACCEPT} multiple onChange={pick} className="sr-only" /></label>
            )}
            <p className="mt-1 text-sm text-muted">Allowed: JPG, PNG, WebP, HEIC, HEIF, or PDF. Up to {MAX_FILES} files, 10 MB each. Only you and your teachers can see them.</p>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {uploadProgress && <div role="status" aria-live="polite" className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm"><p>{uploadProgress}</p><div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full w-2/5 animate-pulse rounded-full bg-primary" /></div></div>}
        {error && added.length > 0 && !locked && <button type="button" disabled={busy} onClick={() => submit()} className="btn-secondary w-full">Try again</button>}
        {done && !error && <p role="status" className="flex items-center gap-1.5 text-sm text-success"><CircleCheck className="h-4 w-4" /> Handed in. You can still change it until it&apos;s marked.</p>}
        {!locked && <button disabled={busy} className="btn-primary w-full"><Send className="h-4 w-4" /> {busy ? "Uploading…" : sub ? "Update my work" : "Hand in"}</button>}
      </form>
    </div>
  );
}
