"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const toInput = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16); // IST for datetime-local
const fromInput = (v) => new Date(`${v}:00+05:30`).toISOString();
const show = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Coupons for UPI payments: a code with its own price, valid between two times (India time).
export default function Coupons({ coupons }) {
  const router = useRouter();
  const now = new Date();
  const [form, setForm] = useState({ code: "", price: 499, from: toInput(now), until: toInput(new Date(now.getTime() + 2 * 864e5)) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault(); setBusy(true); setError("");
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) { setBusy(false); return setError("Use 3–20 letters or numbers, no spaces (e.g. WORKSHOP499)."); }
    const { error: dbError } = await createClient().from("coupons").insert({ code, price_inr: Number(form.price), valid_from: fromInput(form.from), valid_until: fromInput(form.until) });
    setBusy(false);
    if (dbError) return setError(/duplicate|unique/i.test(dbError.message) ? "That code already exists." : dbError.message);
    setForm((f) => ({ ...f, code: "" }));
    router.refresh();
  }

  async function toggle(c) {
    const { error: dbError } = await createClient().from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (dbError) return setError(dbError.message);
    router.refresh();
  }

  // Two taps to delete: first tap asks, second tap deletes. Past payments keep their code as text.
  async function remove(c) {
    if (confirming !== c.id) return setConfirming(c.id);
    setConfirming(null);
    const { error: dbError } = await createClient().from("coupons").delete().eq("id", c.id);
    if (dbError) return setError(dbError.message);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Code</span><input id="coupon-code" value={form.code} onChange={set("code")} placeholder="WORKSHOP499" className="input uppercase" required /></label>
        <label className="block"><span className="label">Price with coupon (₹)</span><input id="coupon-price" type="number" min="1" value={form.price} onChange={set("price")} className="input" required /></label>
        <label className="block"><span className="label">Valid from (India time)</span><input id="coupon-from" type="datetime-local" value={form.from} onChange={set("from")} className="input" required /></label>
        <label className="block"><span className="label">Valid until (India time)</span><input id="coupon-until" type="datetime-local" value={form.until} onChange={set("until")} className="input" required /></label>
        <button disabled={busy} className="btn-primary sm:col-span-2"><Plus className="h-4 w-4" /> {busy ? "Creating…" : "Create coupon"}</button>
      </form>
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {coupons.length > 0 && (
        <ul className="space-y-2">
          {coupons.map((c) => {
            const live = c.active && new Date(c.valid_from) <= now && now <= new Date(c.valid_until);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <span className="font-mono font-semibold">{c.code}</span>
                <span>₹{c.price_inr}</span>
                <span className="text-xs text-muted">{show(c.valid_from)} → {show(c.valid_until)}</span>
                <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${live ? "bg-success-soft text-success" : "bg-surface-2 text-muted"}`}>{live ? "Live" : c.active ? "Not live now" : "Off"}</span>
                <button type="button" onClick={() => toggle(c)} className="btn-ghost ml-auto min-h-11 px-3">{c.active ? "Turn off" : "Turn on"}</button>
                <button type="button" onClick={() => remove(c)} aria-label={`Delete coupon ${c.code}`} className={`btn-ghost min-h-11 px-3 ${confirming === c.id ? "bg-danger-soft text-danger" : "text-muted"}`}>
                  <Trash2 className="h-4 w-4" />{confirming === c.id && " Tap again to delete"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
