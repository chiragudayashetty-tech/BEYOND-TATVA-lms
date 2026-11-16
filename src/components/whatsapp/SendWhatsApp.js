"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { sendTemplate } from "@/app/admin/automations/actions";

// Send one AiSensy template to one person (lead page) or a filtered group (Pipeline).
// targets: [{ lead_id, student_id }]; phones and names are looked up on the server.
export default function SendWhatsApp({ templates, targets, label = "Send WhatsApp" }) {
  const active = (templates ?? []).filter((t) => t.active);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(active[0]?.key ?? "");
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const t = active.find((x) => x.key === key);
  const many = targets.length > 1;

  if (!active.length) return <a href="/admin/automations#templates" className="btn-secondary"><MessageCircle size={16} /> Add a WhatsApp template first</a>;
  if (!open) return <button type="button" className="btn-secondary" onClick={() => setOpen(true)}><MessageCircle size={16} /> {label}</button>;
  return (
    <div className="w-full space-y-2 rounded-xl border border-border p-3">
      <label className="label" htmlFor="wa-template">Template</label>
      <select id="wa-template" className="input" value={key} onChange={(e) => { setKey(e.target.value); setMsg(null); }}>
        {active.map((x) => <option key={x.key} value={x.key}>{x.title} ({x.language === "kn" ? "ಕನ್ನಡ" : "English"}, {x.category})</option>)}
      </select>
      {t?.body && <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-sm">{t.body}</p>}
      {t?.params?.length > 0 && <p className="text-xs text-muted">Filled in: {t.params.map((p, i) => `{{${i + 1}}} ${p}`).join(" · ")}</p>}
      {msg && <p className="text-sm" role="status">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={pending || !key}
          onClick={() => {
            if (many && !window.confirm(`Send "${t.title}" to ${targets.length} people?`)) return;
            start(async () => { const r = await sendTemplate(key, targets); setMsg(r.ok ? r.message : r.error); });
          }}>
          {pending ? "Queuing…" : many ? `Send to ${targets.length}` : "Send"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  );
}
