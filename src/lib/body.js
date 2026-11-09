// Reads a request body as text, refusing anything over `max` bytes before parsing it.
// Returns null when the body is too big.
export async function readLimited(request, max = 10_000) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  const text = await request.text();
  return Buffer.byteLength(text) > max ? null : text;
}

export async function readJson(request, max = 10_000) {
  const text = await readLimited(request, max);
  if (text === null) return { tooBig: true, body: null };
  try {
    return { tooBig: false, body: JSON.parse(text || "{}") };
  } catch {
    return { tooBig: false, body: {} };
  }
}
