// Beyond Tatva offline helper. Deliberately tiny: it never touches API calls, sign-in, payments or videos.
// 1. Page loads: always the network. Only when there is no connection, show the saved Downloads page
//    (src/lib/offline.js saves it), where downloaded lessons play without internet.
// 2. The app's own build files (/_next/static, named by content so they never change) are kept after first use.
const SHELL = "bt-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A saved lesson, served from its 4 MB pieces with proper Range answers (Safari only plays video that way).
  if (url.pathname.startsWith("/__offline-play/")) {
    event.respondWith(playSaved(request, url));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(SHELL);
      const saved = await cache.match("/downloads");
      if (!saved) return Response.error();
      // Other pages can't open offline: send them to Downloads rather than show its HTML under the wrong address.
      return url.pathname === "/downloads" ? saved : Response.redirect("/downloads", 302);
    }));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.open(SHELL).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }));
  }
});

const CHUNK = 4 * 1024 * 1024;
async function playSaved(request, url) {
  const id = url.pathname.split("/")[2];
  const size = Number(url.searchParams.get("size"));
  if (!id || !(size > 0)) return new Response(null, { status: 404 });
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") || "");
  let start = range && range[1] ? Number(range[1]) : 0;
  let end = range && range[2] ? Number(range[2]) : size - 1;
  if (range && !range[1] && range[2]) { start = Math.max(0, size - Number(range[2])); end = size - 1; }
  end = Math.min(end, size - 1, start + 2 * CHUNK - 1); // answer at most two pieces at a time
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  const cache = await caches.open("bt-offline-v1");
  const parts = [];
  for (let i = Math.floor(start / CHUNK); i <= Math.floor(end / CHUNK); i += 1) {
    const hit = await cache.match(`/__offline/${id}/${i}`);
    if (!hit) return new Response(null, { status: 404 });
    const from = Math.max(start - i * CHUNK, 0);
    const to = Math.min(end - i * CHUNK + 1, CHUNK);
    parts.push((await hit.blob()).slice(from, to));
  }
  const body = new Blob(parts, { type: "video/mp4" });
  return new Response(body, {
    status: 206,
    headers: { "content-type": "video/mp4", "content-length": String(body.size), "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "cache-control": "no-store" },
  });
}
