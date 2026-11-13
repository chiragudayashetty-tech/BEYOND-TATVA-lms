# Offline lesson downloads

_Built 2026-11-13. Chirag's choices: saved inside the app (not a loose MP4 in the gallery), 720p._

## What students get
- **Course page:** each open module has "Download for offline" (all its videos). **Lesson page:** the same for one lesson.
- Before it starts, the app shows the size and says "use Wi-Fi if you can".
- **Downloads page** (`/downloads`, in the sidebar; "Open Downloads" after a download): play, pause/resume, delete, space used.
- With no internet, opening the app lands on Downloads and the saved lessons play. Watch time made offline is
  kept on the device and sent when the internet is back (same `save_progress` rules, so 90% still completes the lesson).
- A lesson that is already saved plays from the saved copy on the normal lesson page too (no data used).

## How it works
- `GET /api/lesson-download?lesson=<id>`: signed-in only; reads `lesson_media` through RLS (`can_watch_lesson`), so a
  student can only download what they can watch. For Bunny videos it returns the MP4 fallback link
  (`https://<BUNNY_CDN_HOST>/<video id>/play_720p.mp4`, falling back to 480p then 360p), signed for 6 hours when
  `BUNNY_CDN_TOKEN_KEY` is set.
- `src/lib/offline.js`: downloads in 4 MB pieces (HTTP Range) into the browser's Cache storage. A dropped connection
  or a closed app loses at most one piece; it retries by itself and carries on when the app is opened again.
- `public/sw.js`: a tiny service worker. Page loads always use the network; only when there is none does it show the
  saved Downloads page. It never touches API calls, sign-in, payments or video streaming. Registered the first time a
  student opens Downloads, production only.
- Access: with internet, Downloads re-checks every saved lesson and deletes any the account may no longer watch.
  Without internet a download keeps working for 30 days after its last check.
- No database change. No new dependency.

## Chirag: needed before it works on live (until then the button says "can't be downloaded yet")
1. **Bunny → Stream → your library → Encoding → turn on "MP4 fallback".** It only applies to videos encoded after
   that, so re-encode (or re-upload) Module 0, 1 and 3.
2. **Vercel → Environment variables:** `BUNNY_CDN_HOST` = the library's pull zone host (Bunny → Stream → library →
   API → "CDN hostname", looks like `vz-xxxxxxxx-xxx.b-cdn.net`).
3. **Bunny → CDN → that pull zone → Headers:** CORS on, and add `mp4` to the CORS extension list. (The app reads the
   file from learn.beyondtatva.in; without this the browser blocks it.)
4. Only if the pull zone has **Token Authentication** on: `BUNNY_CDN_TOKEN_KEY` in Vercel = its key. If "Block direct
   URL file access" is on in the library's Security tab, `learn.beyondtatva.in` must be in the allowed domains.

## Size (the honest numbers)
Size = bitrate × length. Bunny's 720p is roughly 1.5–2.5 Mbit/s, so **a 50-minute lesson is about 550–950 MB**.
The app shows the real size before the student starts. Ways to shrink, cheapest first:
- `OFFLINE_VIDEO_QUALITY=480` in Vercel (about half the size, no code change, still fine on a phone).
- Split long modules into 10–15 minute lessons: each download is small and a failed one costs little.
- Export from the editor at 720p / 30 fps before uploading; slides and talking-head compress well.

## Not tested yet (needs the real Bunny setup)
- The Bunny side end to end: MP4 fallback link shape, CORS for Range requests, token signing against a real key.
  Tested here with the demo MP4 only (download, a dropped connection, resume, offline playback, opening the app offline, delete).
- Real phones: cheap Android in Chrome and in the Play Store app, iPhone Safari (iOS gives web apps less storage and
  may clear it after weeks without use).

## Limits to know
- The download runs while the app is open (screen is kept on). It pauses if the app is closed and carries on next time.
- Downloads are per device and per browser. Clearing browser data removes them.
- A determined person can still pull a video out of browser storage with developer tools. This stops casual
  forwarding on WhatsApp, not piracy. Only DRM (Bunny MediaCage) does more, and DRM video cannot be saved offline in a web app.

## iPhone / Safari (2026-11-13)
On iOS 26 Safari a saved lesson shows its first frame and seeks, but won't play (online or offline), both as one
Blob and served in pieces by `public/sw.js`. Chromium plays the same path fine. So downloads are hidden on Apple's
engine (`appleWebKit()` in `src/lib/offline.js`) and the Downloads page says "coming soon". Next idea to try:
the raw Bunny MP4 link opened directly in Safari, to rule out the file itself.
