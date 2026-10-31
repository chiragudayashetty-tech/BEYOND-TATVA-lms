// Works out what kind of video link an admin pasted and how to play it.
// Shared by the player (client), the admin form (validation) and tests, so keep it dependency-free.
//
// kinds: "file"    direct video file (MP4/WebM/MOV) or a path under /media → <video>, full tracking
//        "youtube" YouTube (watch, youtu.be, shorts, live, embed) → IFrame API, full tracking
//        "drive"   Google Drive file → Drive's preview player, no tracking (manual "Mark as complete")
//        "vimeo"   Vimeo → Vimeo's player, no tracking
//        "bunny"   Bunny Stream embed/play link → Bunny's player, no tracking
//        null      not a link we can play

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const FILE_EXT = /\.(mp4|m4v|webm|mov|ogv)$/i;

export function parseVideo(input) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return FILE_EXT.test(raw.split("?")[0]) ? { kind: "file", src: raw } : null;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);

  // YouTube
  if (host === "youtu.be") return youtube(parts[0], url);
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    if (parts[0] === "watch") return youtube(url.searchParams.get("v"), url);
    if (["embed", "shorts", "live", "v"].includes(parts[0])) return youtube(parts[1], url);
    return null;
  }

  // Google Drive: /file/d/ID/view, /open?id=ID, /uc?id=ID
  if (host === "drive.google.com" || host === "docs.google.com") {
    const id = parts[0] === "file" && parts[1] === "d" ? parts[2] : url.searchParams.get("id");
    if (!id || !/^[A-Za-z0-9_-]{10,}$/.test(id)) return null;
    return { kind: "drive", id, embed: `https://drive.google.com/file/d/${id}/preview` };
  }

  // Vimeo: vimeo.com/123456[/hash], player.vimeo.com/video/123456?h=hash
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const i = parts[0] === "video" ? 1 : 0;
    const id = parts[i];
    if (!/^\d+$/.test(id ?? "")) return null;
    const hash = url.searchParams.get("h") || (parts[i + 1] && /^[a-f0-9]+$/i.test(parts[i + 1]) ? parts[i + 1] : null);
    return { kind: "vimeo", id, embed: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}` };
  }

  // Bunny Stream: iframe.mediadelivery.net/{embed|play}/LIBRARY/VIDEO (signed ?token=&expires= kept)
  if (host === "iframe.mediadelivery.net" || host === "player.mediadelivery.net") {
    if (!["embed", "play"].includes(parts[0]) || !/^\d+$/.test(parts[1] ?? "") || !parts[2]) return null;
    const keep = new URLSearchParams();
    for (const k of ["token", "expires"]) if (url.searchParams.get(k)) keep.set(k, url.searchParams.get(k));
    keep.set("preload", "true");
    keep.set("responsive", "true");
    return { kind: "bunny", id: parts[2], embed: `https://iframe.mediadelivery.net/embed/${parts[1]}/${parts[2]}?${keep}` };
  }

  if (FILE_EXT.test(url.pathname)) return { kind: "file", src: url.toString() };
  return null;
}

function youtube(id, url) {
  if (!id || !YT_ID.test(id)) return null;
  const t = url.searchParams.get("t") || url.searchParams.get("start");
  const start = t ? parseTime(t) : 0;
  return { kind: "youtube", id, start };
}

// "90", "90s", "1m30s", "1h2m3s" → seconds
function parseTime(t) {
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

export const VIDEO_HELP = "Paste a YouTube, Google Drive, Vimeo or Bunny Stream link, or a direct .mp4 link.";

// Players that report time, so lessons can complete themselves at 90% watched.
export const tracksProgress = (v) => v?.kind === "file" || v?.kind === "youtube";
