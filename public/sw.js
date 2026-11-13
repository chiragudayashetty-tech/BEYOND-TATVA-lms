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
