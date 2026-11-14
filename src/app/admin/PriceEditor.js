"use client";

import { useActionState, useState } from "react";
import { CircleCheck, IndianRupee, Save } from "lucide-react";
import PriceTag from "@/components/PriceTag";
import { savePrice } from "./actions";

// One place to change the price: the LMS checkout, the website and its checkout all read it (/api/price).
export default function PriceEditor({ price, listPrice }) {
  const [state, action, pending] = useActionState(savePrice, null);
  const [p, setP] = useState(String(price ?? ""));
  const [l, setL] = useState(String(listPrice ?? ""));
  const pn = Number(p), ln = Number(l);
  return (
    <form action={action} className="card mb-4 grid gap-5 p-5 sm:mb-6 md:grid-cols-[1fr_auto] md:items-center">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><IndianRupee className="h-4 w-4 text-primary" /> Pricing</h2>
          {state && (state.ok
            ? <span className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="h-4 w-4" /> Saved. Website and app update within about a minute.</span>
            : <span role="alert" className="text-sm text-danger">{state.error}</span>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="label">Price (₹, what parents pay)</span>
            <input name="price" type="number" min={1} max={100000} required className="input" value={p} onChange={(e) => setP(e.target.value)} /></label>
          <label className="block"><span className="label">Original price (₹, crossed out)</span>
            <input name="list_price" type="number" min={1} max={100000} className="input" value={l} onChange={(e) => setL(e.target.value)} placeholder="Optional" /></label>
        </div>
        <p className="text-xs text-muted">Changes the LMS checkout, the website and the website checkout together. Coupons still apply on top.</p>
        <button disabled={pending} className="btn-primary"><Save className="h-4 w-4" /> {pending ? "Saving…" : "Save price"}</button>
      </div>
      <div className="rounded-2xl border border-border p-4 text-center">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Preview</div>
        {pn > 0 ? <PriceTag key={`${pn}-${ln}`} price={pn} listPrice={ln > pn ? ln : null} /> : <span className="text-sm text-muted">Enter a price</span>}
      </div>
    </form>
  );
}
