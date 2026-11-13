"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheck, Download, Pause, Play, Trash2, TriangleAlert } from "lucide-react";
import { download, fmtSize, offlineSupported, pause, remove, resume, resumeInterrupted, saveShell, savedBytes, sizeUp, useOffline } from "@/lib/offline";
import { useIsClient } from "@/lib/hooks";

export const OFFLINE_ERRORS = {
  not_ready: "This video can't be downloaded yet. Coming soon. You can still watch it online.",
  no_space: "There isn't enough free space on this device. Delete some photos or old downloads and try again.",
  no_access: "This lesson isn't open on your account, so it can't be downloaded.",
  network: "The download stopped. Check your internet and tap Try again. It carries on from where it stopped.",
};

// "Download for offline" for one lesson or a whole module (all its lessons).
// lessons: [{ id, n, title, mins, courseId, module, moduleTitle }]
export default function OfflineDownload({ lessons, userId, label = "Download for offline" }) {
  const all = useOffline();
  const ready = useIsClient();
  const [ask, setAsk] = useState(null); // null | "sizing" | { bytes } | { error }
  useEffect(() => { resumeInterrupted(); }, []);
  // Get the app ready to open without internet as soon as anything is saved, not only after visiting Downloads.
  const hasSaved = Object.values(all).some((e) => e.userId === userId);
  useEffect(() => { if (hasSaved && navigator.onLine) void saveShell(); }, [hasSaved]);

  if (!ready || !offlineSupported() || !userId || !lessons?.length) return null;
  const mine = lessons.map((l) => all[l.id]).filter((e) => e && e.userId === userId);
  const done = mine.filter((e) => e.status === "done");
  const failed = mine.find((e) => e.status === "error");
  const busy = mine.some((e) => e.status === "downloading");
  const paused = mine.some((e) => e.status === "paused");
  const got = mine.reduce((n, e) => n + savedBytes(e), 0);
  const total = mine.reduce((n, e) => n + (e.size || 0), 0);
  const pct = total > 0 ? Math.min(100, Math.round((got / total) * 100)) : 0;
  const start = () => { setAsk(null); lessons.forEach((l) => download(l, userId)); };

  async function prepare() {
    setAsk("sizing");
    try {
      setAsk({ bytes: await sizeUp(lessons.map((l) => l.id)) });
    } catch (err) {
      setAsk({ error: OFFLINE_ERRORS[err.fatal] ?? "Couldn't reach the server. Check your internet and try again." });
    }
  }

  if (done.length === lessons.length) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-success-soft p-3 text-sm">
        <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <span className="min-w-0 flex-1 basis-40 font-medium">Saved on this device · {fmtSize(got)}</span>
        <Link href="/downloads" className="btn-ghost min-h-11 px-3 text-sm">Open Downloads</Link>
      </div>
    );
  }

  if (failed && !busy) {
    return (
      <div role="alert" className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
        <p className="flex gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" /> {OFFLINE_ERRORS[failed.error] ?? OFFLINE_ERRORS.network}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {failed.error !== "no_access" && failed.error !== "not_ready" && <button type="button" onClick={() => mine.filter((e) => e.status !== "done").forEach((e) => resume(e.id))} className="btn-secondary min-h-11 px-3 text-sm">Try again</button>}
          <button type="button" onClick={() => mine.filter((e) => e.status !== "done").forEach((e) => remove(e.id))} className="btn-ghost min-h-11 px-3 text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  if (busy || paused) {
    return (
      <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="min-w-0 flex-1 basis-40 font-medium">
            {busy ? "Downloading" : "Paused"} {total > 0 ? `${pct}% · ${fmtSize(got)} of ${fmtSize(total)}` : "…"}
          </span>
          {busy
            ? <button type="button" onClick={() => mine.forEach((e) => pause(e.id))} className="btn-ghost min-h-11 px-3 text-sm"><Pause className="h-4 w-4" /> Pause</button>
            : <button type="button" onClick={() => mine.filter((e) => e.status === "paused").forEach((e) => resume(e.id))} className="btn-secondary min-h-11 px-3 text-sm"><Play className="h-4 w-4" /> Resume</button>}
          <button type="button" onClick={() => mine.filter((e) => e.status !== "done").forEach((e) => remove(e.id))} aria-label="Cancel download" className="btn-ghost min-h-11 min-w-11 px-3 text-sm"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} /></div>
        {busy && <p className="mt-2 text-xs text-muted">Keep the app open. If the internet drops, the download carries on by itself.</p>}
      </div>
    );
  }

  if (ask && ask !== "sizing") {
    return (
      <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
        {ask.error
          ? <p role="alert" className="flex gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" /> {ask.error}</p>
          : <p>{ask.bytes > 0 ? <>This download is about <strong>{fmtSize(ask.bytes)}</strong>. </> : null}Use Wi-Fi if you can. The video is saved inside this app and plays without internet.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {!ask.error && <button type="button" onClick={start} className="btn-primary min-h-11 px-3 text-sm"><Download className="h-4 w-4" /> Start download</button>}
          <button type="button" onClick={() => setAsk(null)} className="btn-ghost min-h-11 px-3 text-sm">{ask.error ? "OK" : "Not now"}</button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={prepare} disabled={ask === "sizing"} className="btn-secondary mt-3 w-full sm:w-auto">
      <Download className="h-4 w-4" /> {ask === "sizing" ? "Checking size…" : label}
    </button>
  );
}
