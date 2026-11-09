// Downloads every file from the private Storage buckets into ./storage-backup/<bucket>/<path>.
// Used by the nightly backup workflow (encrypted before upload). No npm packages: plain fetch.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const headers = { authorization: `Bearer ${key}`, apikey: key };
const BUCKETS = ["submissions", "payment-proofs", "module-resources", "newsletters"];

async function list(bucket, prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (r.status === 400 || r.status === 404) return out; // bucket doesn't exist
    if (!r.ok) throw new Error(`list ${bucket}/${prefix}: ${r.status}`);
    const items = await r.json();
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) out.push(...(await list(bucket, path))); // folder
      else out.push(path);
    }
    if (items.length < 1000) return out;
  }
}

let files = 0, bytes = 0;
for (const bucket of BUCKETS) {
  for (const path of await list(bucket, "")) {
    const r = await fetch(`${url}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, { headers });
    if (!r.ok) throw new Error(`download ${bucket}/${path}: ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const dest = join("storage-backup", bucket, path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    files += 1; bytes += buf.length;
  }
}
console.log(`Storage backup: ${files} files, ${(bytes / 1048576).toFixed(1)} MB`);
