"use client";

// Offline lessons: a student saves a lesson's video inside the app (browser storage, not the phone's
// gallery) and watches it later without internet.
//
// How it works
// - The video is fetched in 4 MB pieces (HTTP Range) and each piece is stored in the Cache API. A dropped
//   connection or a closed app loses at most one piece: the download carries on from the next one.
// - What is saved (title, size, pieces done) lives in localStorage, per student account.
// - Playback glues the pieces into one Blob. Browsers keep those on disk, so a 600 MB lesson doesn't
//   fill the phone's memory.
// - Watch time made offline is kept on the device and sent to save_progress when the internet is back.

import { useSyncExternalStore } from "react";

const CACHE = "bt-offline-v1";
const SHELL = "bt-shell-v1";
const META = "offline:lessons";
const PENDING = "offline:progress";
export const CHUNK = 4 * 1024 * 1024;
const SPARE = 50 * 1024 * 1024; // leave the phone some room
const STALE_DAYS = 30; // downloads must meet the internet this often so access can be re-checked

const EMPTY = Object.freeze({});
const piece = (id, i) => `/__offline/${id}/${i}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fatal = (code) => Object.assign(new Error(code), { fatal: code });

export const offlineSupported = () => typeof window !== "undefined" && "caches" in window && typeof localStorage !== "undefined";
export const fmtSize = (b) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1024 ** 2))} MB`);

// ── Store ────────────────────────────────────────────────────────────────────
let items = null; // { [lessonId]: entry }
let active = null; // { id, abort }
const listeners = new Set();

function read() {
  if (items) return items;
  if (typeof localStorage === "undefined") return EMPTY;
  try { items = JSON.parse(localStorage.getItem(META) ?? "{}") ?? {}; } catch { items = {}; }
  return items;
}
function write(next) {
  items = next;
  try { localStorage.setItem(META, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
function patch(id, changes) {
  const all = read();
  if (!all[id]) return null;
  write({ ...all, [id]: { ...all[id], ...changes } });
  return items[id];
}
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

// Every saved lesson on this device, keyed by lesson id. Empty while server-rendering.
export function useOffline() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
export const savedBytes = (e) => (e.status === "done" ? e.size : Math.min(e.got * CHUNK, e.size || Infinity));

// ── Downloading ──────────────────────────────────────────────────────────────
async function link(id) {
  const res = await fetch(`/api/lesson-download?lesson=${id}`, { cache: "no-store" });
  if (res.status === 409) throw fatal("not_ready");
  if (res.status === 401 || res.status === 403) throw fatal("no_access");
  if (!res.ok) throw new Error(`link ${res.status}`);
  return res.json();
}

// Total size of these lessons before anything is downloaded, so the student can decide (Wi-Fi or not).
export async function sizeUp(lessonIds) {
  const links = await Promise.all(lessonIds.map(link));
  return links.reduce((n, l) => n + (l.size || 0), 0);
}

async function roomFor(bytes) {
  try {
    const { quota = 0, usage = 0 } = (await navigator.storage?.estimate?.()) ?? {};
    return !quota || bytes + SPARE < quota - usage;
  } catch {
    return true;
  }
}

function online() {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((r) => window.addEventListener("online", r, { once: true }));
}

async function run(id) {
  const abort = new AbortController();
  active = { id, abort };
  let source = null; let fails = 0; let denied = 0;
  try {
    const cache = await caches.open(CACHE);
    for (;;) {
      const e = read()[id];
      if (!e || e.status !== "downloading" || abort.signal.aborted) return;
      if (e.chunks && e.got >= e.chunks) break;
      try {
        await online();
        source ??= await link(id);
        const size = e.size || source.size || 0;
        if (e.got === 0 && size && !(await roomFor(size))) throw fatal("no_space");
        const from = e.got * CHUNK;
        if (size && from >= size) { patch(id, { chunks: e.got, size }); break; }
        const to = size ? Math.min(from + CHUNK, size) - 1 : from + CHUNK - 1;
        const res = await fetch(source.url, { headers: { Range: `bytes=${from}-${to}` }, signal: abort.signal, cache: "no-store" });
        if (res.status === 401 || res.status === 403) { // the signed link ran out: ask for a new one
          source = null;
          if (++denied > 2) throw fatal("no_access");
          continue;
        }
        if (res.status === 416) { patch(id, { chunks: e.got, size: from }); break; } // asked past the end: we have it all
        if (res.status === 404) throw fatal("not_ready");
        if (res.status !== 200 && res.status !== 206) throw new Error(`video ${res.status}`);
        if (res.status === 200 && e.got > 0) throw fatal("not_ready"); // server ignores Range: can't carry on from the middle
        const blob = await res.blob();
        const whole = res.status === 200;
        const total = whole ? blob.size : size || Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1]) || 0;
        const last = whole || (total ? from + blob.size >= total : blob.size < CHUNK);
        try {
          await cache.put(piece(id, e.got), new Response(blob, { headers: { "content-type": "video/mp4" } }));
        } catch (err) {
          throw err?.name === "QuotaExceededError" ? fatal("no_space") : err;
        }
        fails = 0; denied = 0;
        const got = e.got + 1;
        const fullSize = total || (last ? from + blob.size : 0);
        patch(id, { got, size: fullSize, quality: source.quality ?? null, ...(last ? { chunks: got } : fullSize ? { chunks: Math.ceil(fullSize / CHUNK) } : {}) });
        if (last) break;
      } catch (err) {
        if (abort.signal.aborted) return;
        if (err.fatal) { patch(id, { status: "error", error: err.fatal }); return; }
        if (++fails > 8) { patch(id, { status: "error", error: "network" }); return; }
        await sleep(Math.min(30_000, 1000 * 2 ** fails));
      }
    }
    patch(id, { status: "done", error: null, savedAt: Date.now(), checkedAt: Date.now() });
  } finally {
    active = null;
  }
}

// One lesson downloads at a time; the rest wait their turn.
let pumping = false;
async function pump() {
  if (pumping) return;
  pumping = true;
  const lock = await keepAwake();
  try {
    for (;;) {
      const next = Object.values(read()).filter((e) => e.status === "downloading").sort((a, b) => a.addedAt - b.addedAt)[0];
      if (!next) break;
      await run(next.id);
    }
  } finally {
    pumping = false;
    lock();
  }
}

// Keep the screen on while a download runs (phones pause the network when they sleep).
async function keepAwake() {
  let lock = null; let stopped = false;
  const ask = async () => {
    if (stopped || document.visibilityState !== "visible") return;
    try { lock = await navigator.wakeLock?.request("screen"); } catch {}
  };
  await ask();
  document.addEventListener("visibilitychange", ask);
  return () => { stopped = true; document.removeEventListener("visibilitychange", ask); lock?.release?.().catch(() => {}); };
}

// lesson: { id, n, title, mins, courseId, module, moduleTitle }
export function download(lesson, userId) {
  if (!offlineSupported()) return;
  const all = read();
  const old = all[lesson.id];
  const mine = old && old.userId === userId;
  if (mine && old.status === "done") return;
  write({
    ...all,
    [lesson.id]: {
      got: 0, size: 0, chunks: 0, quality: null, addedAt: Date.now(), ...(mine ? old : {}),
      ...lesson, userId, status: "downloading", error: null,
    },
  });
  navigator.storage?.persist?.().catch(() => {}); // ask the browser not to clear downloads when space runs low
  void pump();
}

export function pause(id) {
  if (read()[id]?.status !== "downloading") return;
  patch(id, { status: "paused" });
  if (active?.id === id) active.abort.abort();
}

export function resume(id) {
  const e = read()[id];
  if (!e || e.status === "done") return;
  patch(id, { status: "downloading", error: null });
  void pump();
}

export async function remove(id) {
  const all = { ...read() };
  if (!all[id]) return;
  if (active?.id === id) active.abort.abort();
  delete all[id];
  write(all);
  try {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    await Promise.all(keys.filter((k) => new URL(k.url).pathname.startsWith(`/__offline/${id}/`)).map((k) => cache.delete(k)));
  } catch {}
}

// Downloads that were running when the app was closed carry on by themselves the next time it opens.
export function resumeInterrupted() {
  if (!offlineSupported() || pumping) return;
  if (Object.values(read()).some((e) => e.status === "downloading")) void pump();
}

// A link the <video> player can play from this device, or null when the lesson isn't fully saved.
// The caller must URL.revokeObjectURL() it when done.
export async function localVideoUrl(id) {
  const e = read()[id];
  if (!e || e.status !== "done" || !offlineSupported()) return null;
  try {
    const cache = await caches.open(CACHE);
    const parts = [];
    for (let i = 0; i < e.chunks; i += 1) {
      const res = await cache.match(piece(id, i));
      if (!res) { // the browser cleared some of it: start over rather than play a broken file
        await remove(id);
        return null;
      }
      parts.push(await res.blob());
    }
    return URL.createObjectURL(new Blob(parts, { type: "video/mp4" }));
  } catch {
    return null;
  }
}

// ── Keeping access honest ────────────────────────────────────────────────────
// Online: ask the server whether this student may still watch each saved lesson; remove the ones they may not.
// Offline that can't be asked, so a download unlocks for 30 days after its last successful check.
export async function recheck(userId) {
  const mine = Object.values(read()).filter((e) => e.userId === userId);
  await Promise.all(mine.map(async (e) => {
    try {
      const res = await fetch(`/api/lesson-download?lesson=${e.id}&check=1`, { cache: "no-store" });
      if (res.status === 403) await remove(e.id);
      else if (res.ok) patch(e.id, { checkedAt: Date.now() });
    } catch {}
  }));
}
export const needsInternet = (e) => Date.now() - (e.checkedAt ?? e.savedAt ?? 0) > STALE_DAYS * 86_400_000;

// ── Watch time made offline ──────────────────────────────────────────────────
function pending() {
  try { return JSON.parse(localStorage.getItem(PENDING) ?? "{}") ?? {}; } catch { return {}; }
}
export function keepProgress(userId, lessonId, { seconds, position, duration }) {
  const all = pending();
  const key = `${userId}:${lessonId}`;
  all[key] = { seconds: Math.max(Math.floor(seconds), all[key]?.seconds ?? 0), position: Math.floor(position), duration: Math.floor(duration) || null };
  try { localStorage.setItem(PENDING, JSON.stringify(all)); } catch {}
}
// Sends kept watch time for this student. Returns how many lessons were saved.
export async function sendProgress(supabase, userId) {
  if (!navigator.onLine) return 0;
  const all = pending();
  let sent = 0;
  for (const [key, p] of Object.entries(all)) {
    const [uid, lessonId] = key.split(":");
    if (uid !== userId) continue;
    const { error } = await supabase.rpc("save_progress", { p_lesson: lessonId, p_seconds: p.seconds, p_position: p.position, p_duration: p.duration });
    // "not open for you" will never succeed later: drop it. Anything else (network): keep and retry.
    if (error && !/open for you/i.test(error.message ?? "")) continue;
    const now = pending();
    if (now[key]?.seconds === p.seconds && now[key]?.position === p.position) { delete now[key]; try { localStorage.setItem(PENDING, JSON.stringify(now)); } catch {} }
    if (!error) sent += 1;
  }
  return sent;
}

// ── Opening the app without internet ─────────────────────────────────────────
// public/sw.js answers page loads with the saved Downloads page when there is no connection.
// Production only: the dev server's files change under the same names.
export async function saveShell() {
  if (!offlineSupported() || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
  try {
    await navigator.serviceWorker.register("/sw.js");
    const page = await fetch("/downloads", { cache: "no-store", credentials: "same-origin" });
    if (!page.ok || page.redirected) return;
    const assets = new Set();
    const own = (u) => { try { const x = new URL(u, location.href); return x.origin === location.origin && x.pathname.startsWith("/_next/static/") ? x.pathname + x.search : null; } catch { return null; } };
    for (const el of document.querySelectorAll("script[src], link[href]")) { const u = own(el.src || el.href); if (u) assets.add(u); }
    for (const r of performance.getEntriesByType("resource")) { const u = own(r.name); if (u) assets.add(u); }
    const cache = await caches.open(SHELL);
    await Promise.all([...assets].map(async (u) => { if (!(await cache.match(u))) await cache.add(u).catch(() => {}); }));
    await cache.put("/downloads", page);
  } catch {}
}
