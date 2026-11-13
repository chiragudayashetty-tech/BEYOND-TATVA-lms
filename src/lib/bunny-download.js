import { createHash } from "node:crypto";

// Download link for a Bunny Stream video: the MP4 copy on the library's CDN ("MP4 Fallback" must be on in Bunny).
// If the pull zone uses Token Authentication, the link is signed (Bunny basic token: base64url(sha256(key + path + expires))).
// Env: BUNNY_CDN_HOST (vz-xxxx.b-cdn.net), BUNNY_CDN_TOKEN_KEY (only with Token Authentication).
const HOST = /^[a-z0-9.-]+\.b-cdn\.net$/i;
const GUID = /^[A-Za-z0-9-]{8,64}$/;

export function bunnyDownloadUrl(videoId, { host, tokenKey, now = Date.now(), ttlSeconds = 3600, resolution = "720p" } = {}) {
  if (!HOST.test(host ?? "") || !GUID.test(videoId ?? "")) return null;
  const path = `/${videoId}/play_${resolution}.mp4`;
  if (!tokenKey) return `https://${host}${path}`;
  const expires = Math.floor(now / 1000) + ttlSeconds;
  const token = createHash("sha256").update(tokenKey + path + expires).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://${host}${path}?token=${token}&expires=${expires}`;
}
