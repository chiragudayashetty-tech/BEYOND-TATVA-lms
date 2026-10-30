"use client";

import { useState } from "react";
import { Copy, Download, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const fakeCode = () => `BT-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

// Creates one-time access keys for a school's students and lets the admin copy or download them.
export default function KeyGenerator({ courseId, preview }) {
  const [count, setCount] = useState(30);
  const [label, setLabel] = useState("St. Mary's · Grade 9 A");
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (preview) {
      setCodes(Array.from({ length: Number(count) }, fakeCode));
      return setBusy(false);
    }
    const { data, error } = await createClient().rpc("create_access_keys", { p_course: courseId, p_count: Number(count), p_label: label });
    setBusy(false);
    if (error) return setError(error.message);
    setCodes(data ?? []);
  }

  const csv = () => {
    const rows = ["Access key,Batch", ...codes.map((c) => `${c},"${label.replaceAll('"', '""')}"`)];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `access-keys-${label.replace(/\W+/g, "-")}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <form onSubmit={generate} className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <div><label className="label" htmlFor="kb">Batch name</label><input id="kb" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="School · Class" /></div>
        <div><label className="label" htmlFor="kc">Keys</label><input id="kc" type="number" min={1} max={500} className="input" value={count} onChange={(e) => setCount(e.target.value)} /></div>
        <button disabled={busy} className="btn-primary"><KeyRound className="h-4 w-4" /> {busy ? "Creating…" : "Create keys"}</button>
      </form>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}

      {codes.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{codes.length} keys created</span>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(codes.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-secondary px-3 py-1.5 text-xs"><Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy all"}</button>
              <button onClick={csv} className="btn-secondary px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Download CSV</button>
            </div>
          </div>
          <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl bg-surface-2 p-3 font-mono text-sm sm:grid-cols-3">
            {codes.map((c) => <span key={c}>{c}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
