"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, Pause, Play, Trash2, TriangleAlert, WifiOff } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { OFFLINE_ERRORS } from "@/components/OfflineDownload";
import { Empty } from "@/components/ui";
import { useIsClient } from "@/lib/hooks";
import { appleWebKit, fmtSize, keepProgress, localVideoUrl, needsInternet, offlineSupported, pause, recheck, remove, resume, resumeInterrupted, saveShell, savedBytes, sendProgress, useOffline } from "@/lib/offline";
import { createClient } from "@/lib/supabase/client";

const watchNet = (cb) => {
  window.addEventListener("online", cb); window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};
const useOnline = () => useSyncExternalStore(watchNet, () => navigator.onLine, () => true);

export default function DownloadsView({ userId }) {
  const all = useOffline();
  const ready = useIsClient();
  const online = useOnline();
  const [playing, setPlaying] = useState(null); // { id, url }
  const [opening, setOpening] = useState(null);
  const [synced, setSynced] = useState(0);
  const real = Boolean(userId) && userId !== "preview";

  const sync = useCallback(async () => {
    if (!real) return 0;
    try { return await sendProgress(createClient(), userId); } catch { return 0; }
  }, [real, userId]);

  // With internet: save this page for offline use, carry on unfinished downloads, send offline watch time,
  // and drop lessons this account may no longer watch.
  useEffect(() => {
    resumeInterrupted();
    if (!online) return;
    void saveShell();
    sync().then((sent) => { if (sent) setSynced(sent); });
    if (real) void recheck(userId);
  }, [online, real, userId, sync]);

  // Watch time is kept on the device first (works offline), then sent every 15 s when there is internet.
  const latest = useRef(null);
  const onProgress = useCallback((seconds, duration) => {
    if (!playing || !userId) return;
    const max = Math.max(latest.current?.seconds ?? 0, seconds);
    latest.current = { seconds: max, position: seconds, duration };
    keepProgress(userId, playing.id, latest.current);
  }, [playing, userId]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(sync, 15_000);
    return () => { clearInterval(timer); void sync(); URL.revokeObjectURL(playing.url); };
  }, [playing, sync]);

  async function play(e) {
    setOpening(e.id);
    const url = await localVideoUrl(e.id);
    setOpening(null);
    latest.current = null;
    if (url) { setPlaying({ id: e.id, url }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  if (!ready) return null;
  if (!offlineSupported()) return <Empty icon={Download} title="Offline downloads: coming soon here" body={appleWebKit() ? "Saving lessons for offline isn't ready on iPhone, iPad or Safari yet. You can still watch every lesson online." : "Open Beyond Tatva in Chrome, or install the app, to save lessons for offline."} />;

  const mine = Object.values(all).filter((e) => e.userId === userId).sort((a, b) => a.n - b.n);
  const others = Object.values(all).filter((e) => e.userId !== userId);
  const used = mine.reduce((n, e) => n + savedBytes(e), 0);
  const now = playing && all[playing.id];

  return (
    <div className="space-y-4">
      {!online && <div role="status" className="card flex items-start gap-3 p-4 text-sm"><WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" /><p><strong>You&apos;re offline.</strong> Downloaded lessons still play. Your progress saves when the internet is back. Quizzes and assignments need internet.</p></div>}
      {synced > 0 && online && <div role="status" className="card flex items-center gap-3 border-success/40 bg-success-soft p-4 text-sm"><CircleCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> Your offline watch time is saved.</div>}

      {now && (
        <section aria-label="Now playing">
          <VideoPlayer key={playing.url} src={playing.url} title={now.title} onProgress={onProgress} onPauseProgress={(s, d) => { onProgress(s, d); void sync(); }} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-primary">Module {now.module} · {now.moduleTitle}</div>
              <h2 className="text-lg font-semibold">{now.title}</h2>
            </div>
            <button type="button" onClick={() => setPlaying(null)} className="btn-ghost min-h-11 px-3 text-sm">Close video</button>
          </div>
        </section>
      )}

      {mine.length === 0
        ? <Empty icon={Download} title="No downloads yet" body="Open a module on the Course page and tap “Download for offline”. Then watch it here, even without internet."
            action={online ? <Link href="/course" className="btn-primary">Go to the course</Link> : null} />
        : (
          <div className="card divide-y divide-border">
            {mine.map((e) => {
              const pct = e.size > 0 ? Math.min(100, Math.round((savedBytes(e) / e.size) * 100)) : 0;
              const stale = e.status === "done" && needsInternet(e);
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="text-xs font-medium text-muted">Module {e.module} · {e.moduleTitle}</div>
                    <div className="truncate font-medium">{e.title}</div>
                    <div className="mt-0.5 text-xs text-muted" role="status">
                      {e.status === "done" && <>{e.mins ? `${e.mins} min · ` : ""}{fmtSize(e.size)}{stale ? " · Connect to the internet once to keep watching" : ""}</>}
                      {e.status === "downloading" && <>Downloading {e.size > 0 ? `${pct}% · ${fmtSize(savedBytes(e))} of ${fmtSize(e.size)}` : "…"}{!online ? " · waiting for internet" : ""}</>}
                      {e.status === "paused" && <>Paused {e.size > 0 ? `at ${pct}%` : ""}</>}
                      {e.status === "error" && <span className="text-danger"><TriangleAlert className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{OFFLINE_ERRORS[e.error] ?? OFFLINE_ERRORS.network}</span>}
                    </div>
                    {(e.status === "downloading" || e.status === "paused") && <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-border" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} /></div>}
                  </div>
                  <div className="flex items-center gap-1">
                    {e.status === "done" && !stale && <button type="button" onClick={() => play(e)} disabled={opening === e.id} className="btn-primary min-h-11 px-4 text-sm"><Play className="h-4 w-4" /> {opening === e.id ? "Opening…" : playing?.id === e.id ? "Playing" : "Play"}</button>}
                    {e.status === "downloading" && <button type="button" onClick={() => pause(e.id)} className="btn-secondary min-h-11 px-3 text-sm"><Pause className="h-4 w-4" /> Pause</button>}
                    {(e.status === "paused" || (e.status === "error" && e.error !== "no_access" && e.error !== "not_ready")) && <button type="button" onClick={() => resume(e.id)} className="btn-secondary min-h-11 px-3 text-sm"><Play className="h-4 w-4" /> {e.status === "error" ? "Try again" : "Resume"}</button>}
                    <button type="button" onClick={() => { if (playing?.id === e.id) setPlaying(null); void remove(e.id); }} aria-label={`Delete ${e.title} from this device`} className="btn-ghost min-h-11 min-w-11 px-3 text-sm"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {mine.length > 0 && <p className="text-xs text-muted">Using {fmtSize(used)} on this device. Downloads stay inside the app. Deleting one frees the space; you can download it again any time.</p>}
      {others.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <span>Another account saved {others.length} {others.length === 1 ? "lesson" : "lessons"} on this device ({fmtSize(others.reduce((n, e) => n + savedBytes(e), 0))}).</span>
          <button type="button" onClick={() => others.forEach((e) => void remove(e.id))} className="btn-secondary min-h-11 px-3 text-sm">Delete them</button>
        </div>
      )}
    </div>
  );
}
