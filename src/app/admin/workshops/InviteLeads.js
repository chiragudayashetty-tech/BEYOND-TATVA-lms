"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerLeads } from "@/app/admin/actions";

// Register existing leads for one workshop. Only leads with student name, parent name and class 8–10 can be added.
export default function InviteLeads({ workshop, leads, registeredPhones }) {
  const [picked, setPicked] = useState([]);
  const [consent, setConsent] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ready = (l) => l.student_name && l.parent_name && l.grade >= 8 && l.grade <= 10;
  const list = useMemo(() => leads
    .filter((l) => !registeredPhones.has(l.phone))
    .filter((l) => !query || [l.student_name, l.parent_name, l.phone, l.school_name].some((v) => v?.toLowerCase().includes(query.toLowerCase()))),
  [leads, registeredPhones, query]);
  const toggle = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const run = () => start(async () => {
    const res = await registerLeads(workshop.id, picked, consent);
    setResult(res); if (res.ok) { setPicked([]); router.refresh(); }
  });
  return (
    <div className="space-y-3 border-t border-border p-5">
      <input className="input" placeholder="Search leads by name, phone or school" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
        {list.length === 0 && <li className="p-3 text-sm text-muted">No leads to add.</li>}
        {list.slice(0, 200).map((l) => (
          <li key={l.id}>
            <label className={`flex min-h-11 items-center gap-3 px-3 py-2 text-sm ${ready(l) ? "" : "opacity-60"}`}>
              <input type="checkbox" disabled={!ready(l)} checked={picked.includes(l.id)} onChange={() => toggle(l.id)} />
              <span className="min-w-0 flex-1 truncate">{l.student_name || "No student name"} · {l.parent_name || "no parent name"} · {l.phone}{l.grade ? ` · Class ${l.grade}` : ""}</span>
              {!ready(l) && <span className="text-xs text-muted">needs names + class 8–10</span>}
            </label>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I confirm each parent agreed (by phone or WhatsApp) to register their child for this workshop.</span></label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || !picked.length || !consent} onClick={run} className="btn-primary min-h-11">{pending ? "Adding…" : `Register ${picked.length} lead${picked.length === 1 ? "" : "s"}`}</button>
        {result && (result.ok
          ? <span role="status" className="text-sm text-muted">{result.data.added} registered{result.data.skipped.length ? ` · ${result.data.skipped.length} skipped (${[...new Set(result.data.skipped.map((s) => s.reason))].join(", ")})` : ""}</span>
          : <span role="alert" className="text-sm text-danger">{result.error}</span>)}
      </div>
    </div>
  );
}
