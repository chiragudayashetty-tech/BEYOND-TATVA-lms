// Class-start burst test: N signed-in students open the app at the same moment.
// Run ONLY against a Preview deployment (never production) with throwaway test accounts.
//   BASE=https://<preview>.vercel.app SUPABASE_URL=… SUPABASE_ANON_KEY=… \
//   ACCOUNTS=accounts.csv  (lines: email,password)  node scripts/load-test.mjs
// Each student: sign in (password grant) → /dashboard → /course → a lesson page → save progress (RPC).
// Prints p50/p95/p99 per step and the error rate. Watch Supabase → Reports (connections, CPU) while it runs.
import { readFile } from "node:fs/promises";

const { BASE, SUPABASE_URL, SUPABASE_ANON_KEY, ACCOUNTS = "accounts.csv", LESSON = "" } = process.env;
if (!BASE || !SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error("Set BASE, SUPABASE_URL, SUPABASE_ANON_KEY"); process.exit(1); }
if (/learn\.beyondtatva\.in/.test(BASE)) { console.error("Refusing to load-test production"); process.exit(1); }
const accounts = (await readFile(ACCOUNTS, "utf8")).trim().split("\n").map((l) => l.split(","));
const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
const times = {};
let errors = 0;

async function timed(step, fn) {
  const t = performance.now();
  try {
    const r = await fn();
    if (!r.ok) throw new Error(`${step} ${r.status}`);
    return r;
  } catch (e) {
    errors += 1;
    console.error(e.message);
  } finally {
    (times[step] ||= []).push(performance.now() - t);
  }
}

async function student([email, password]) {
  const r = await timed("login", () => fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  if (!r) return;
  const session = await r.json();
  const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  for (const path of ["/dashboard", "/course", ...(LESSON ? [`/watch/${LESSON}`] : [])]) {
    await timed(path, () => fetch(BASE + path, { headers: { cookie }, redirect: "manual" }).then((x) => (x.status < 400 ? { ok: true } : x)));
  }
  if (LESSON) {
    await timed("progress", () => fetch(`${SUPABASE_URL}/rest/v1/rpc/save_progress`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
      body: JSON.stringify({ p_lesson: LESSON, p_seconds: 60, p_position: 60, p_duration: 600 }),
    }));
  }
}

const start = performance.now();
await Promise.all(accounts.map(student));
const pct = (a, p) => a.sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(0);
console.log(`${accounts.length} students in ${((performance.now() - start) / 1000).toFixed(1)} s, ${errors} errors`);
for (const [step, a] of Object.entries(times)) console.log(`${step.padEnd(12)} p50 ${pct(a, 0.5)} ms  p95 ${pct(a, 0.95)} ms  p99 ${pct(a, 0.99)} ms`);
