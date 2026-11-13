import { createHash } from "node:crypto";

// Bunny Stream keeps a plain MP4 copy of each video next to the streaming files ("MP4 fallback"):
//   https://<pull zone host>/<video id>/play_720p.mp4
// Offline downloads fetch that file. When the pull zone has token authentication on, the link must be
// signed: token = url-safe base64 of sha256(key + path + expires). Server only (the key never leaves it).

export const OFFLINE_QUALITIES = [720, 480, 360];

const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const VIDEO_ID = /^[a-f0-9-]{8,64}$/i;

// Qualities to try, best first, starting from the wanted one (OFFLINE_VIDEO_QUALITY, default 720).
export function offlineQualities(wanted) {
  const top = OFFLINE_QUALITIES.includes(Number(wanted)) ? Number(wanted) : OFFLINE_QUALITIES[0];
  return OFFLINE_QUALITIES.filter((q) => q <= top);
}

export function bunnyMp4Url({ host, videoId, quality, key = "", now = Date.now(), ttlSeconds = 6 * 3600 }) {
  const cleanHost = String(host ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!HOST.test(cleanHost) || !VIDEO_ID.test(videoId ?? "") || !OFFLINE_QUALITIES.includes(quality)) return null;
  const path = `/${videoId}/play_${quality}p.mp4`;
  if (!key) return `https://${cleanHost}${path}`;
  const expires = Math.floor(now / 1000) + ttlSeconds;
  const token = createHash("sha256").update(key + path + expires).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://${cleanHost}${path}?token=${token}&expires=${expires}`;
}
