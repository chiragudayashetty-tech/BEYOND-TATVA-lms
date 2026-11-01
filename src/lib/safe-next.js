// The only way to turn a user-supplied "?next=" into a redirect target. Returns a same-site path
// ("/course?x=1") or the fallback. Blocks "//evil.com", "/\evil.com", "javascript:", encoded tricks,
// control characters and anything a browser would resolve to another origin.
const BASE = "https://app.invalid";

export function safeNext(next, fallback = "/dashboard") {
  if (typeof next !== "string" || next.length > 2048) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  let url;
  try { url = new URL(next, BASE); } catch { return fallback; }
  if (url.origin !== BASE) return fallback;
  return url.pathname + url.search + url.hash;
}
