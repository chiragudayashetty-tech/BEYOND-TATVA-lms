"use client";

import { useState, useTransition } from "react";
import { retryMessage, saveAutomation, saveTemplate, sendNow } from "./actions";

// What can fill a template blank ({{1}}, {{2}}…). Values come from the LMS when the message is sent.
export const BLANKS = [
  ["{parent_name}", "Parent name"],
  ["{student_name}", "Child's full name"],
  ["{student_first}", "Child's first name"],
  ["{school}", "School"],
  ["{grade}", "Class"],
  ["{stage}", "Stage (Lead / Signed up / Paid)"],
];
export const blankLabel = (p) => BLANKS.find(([v]) => v === p)?.[1] ?? `"${p}"`;
const keyFrom = (campaign) => campaign.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

// One automatic rule: "When … → send [message]  [On/Off]".
export function RuleSwitch({ rule, messages }) {
  const [template, setTemplate] = useState(rule.template_key ?? "");
  const [on, setOn] = useState(rule.enabled);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const save = (t, enabled) =>
    start(async () => {
      const r = await saveAutomation(rule.key, "", enabled, t);
      if (r.ok) { setTemplate(t); setOn(enabled); setMsg(null); } else setMsg(r.error);
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Send</span>
        <select className="input min-w-0 flex-1" value={template} disabled={pending}
          onChange={(e) => save(e.target.value, on && Boolean(e.target.value))} aria-label={`Message for ${rule.title}`}>
          <option value="">— pick a message —</option>
          {messages.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
        </select>
        <button type="button" disabled={pending || !template} onClick={() => save(template, !on)}
          className={on ? "btn-primary min-w-20" : "btn-secondary min-w-20"} aria-pressed={on}>{on ? "On" : "Off"}</button>
      </div>
      {msg && <p className="text-xs text-danger">{msg}</p>}
    </div>
  );
}

export function SendNow() {
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-muted">{msg}</span>}
      <button type="button" className="btn-secondary" disabled={pending}
        onClick={() => start(async () => { const r = await sendNow(); setMsg(r.ok ? r.message : r.error); })}>
        {pending ? "Sending…" : "Send waiting now"}
      </button>
    </div>
  );
}

export function Retry({ id }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <span className="text-xs text-muted">Will retry</span>;
  return (
    <button type="button" className="text-xs font-medium text-primary underline" disabled={pending}
      onClick={() => start(async () => { const r = await retryMessage(id); setDone(r.ok); })}>Retry</button>
  );
}

// Add / edit one message. The text itself lives in AiSensy; here we only link the AiSensy campaign
// and say what fills each blank.
export function MessageForm({ message }) {
  const [t, setT] = useState({
    title: message?.title ?? "", campaign: message?.campaign ?? "", language: message?.language ?? "kn",
    category: message?.category ?? "marketing", params: message?.params?.length ? message.params : ["{parent_name}"],
    media_url: message?.media_url ?? "", active: message?.active ?? true,
  });
  const [open, setOpen] = useState(!message);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const set = (k, v) => setT({ ...t, [k]: v });
  const setBlank = (i, v) => set("params", t.params.map((p, j) => (j === i ? v : p)));

  if (!open) return <button type="button" className="text-sm font-medium text-primary underline" onClick={() => setOpen(true)}>Edit</button>;
  return (
    <form className="space-y-3 rounded-xl border border-border p-3" onSubmit={(e) => {
      e.preventDefault();
      const key = message?.key ?? keyFrom(t.campaign);
      if (!key) return setMsg("Type the AiSensy campaign name.");
      start(async () => {
        const r = await saveTemplate({ ...t, key, body: message?.body ?? "", params: t.params.filter(Boolean) });
        setMsg(r.ok ? "Saved" : r.error);
        if (r.ok && message) setOpen(false);
      });
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="m-title">Name (for you)</label>
          <input id="m-title" className="input" required maxLength={80} value={t.title} onChange={(e) => set("title", e.target.value)} placeholder="Workshop thank you" /></div>
        <div><label className="label" htmlFor="m-camp">AiSensy campaign name (exact)</label>
          <input id="m-camp" className="input" required maxLength={100} value={t.campaign} onChange={(e) => set("campaign", e.target.value)} placeholder="a1_workshop_kn" /></div>
        <div><label className="label" htmlFor="m-lang">Language</label>
          <select id="m-lang" className="input" value={t.language} onChange={(e) => set("language", e.target.value)}><option value="kn">Kannada</option><option value="en">English</option></select></div>
        <div><label className="label" htmlFor="m-cat">Type (as in AiSensy)</label>
          <select id="m-cat" className="input" value={t.category} onChange={(e) => set("category", e.target.value)}><option value="marketing">Marketing</option><option value="utility">Utility</option></select></div>
      </div>
      <fieldset className="space-y-2">
        <legend className="label">What fills each blank in the AiSensy template</legend>
        {t.params.map((p, i) => {
          const fixed = !BLANKS.some(([v]) => v === p);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-12 text-sm font-mono text-muted">{`{{${i + 1}}}`}</span>
              <select className="input min-w-0 flex-1" value={fixed ? "__fixed" : p} onChange={(e) => setBlank(i, e.target.value === "__fixed" ? "" : e.target.value)} aria-label={`Blank ${i + 1}`}>
                {BLANKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                <option value="__fixed">Same text for everyone…</option>
              </select>
              {fixed && <input className="input min-w-0 flex-1" value={p} maxLength={200} onChange={(e) => setBlank(i, e.target.value)} placeholder="e.g. 15 Nov" aria-label={`Text for blank ${i + 1}`} />}
              <button type="button" className="text-xs text-muted underline" onClick={() => set("params", t.params.filter((_, j) => j !== i))}>Remove</button>
            </div>
          );
        })}
        {t.params.length < 10 && <button type="button" className="text-sm font-medium text-primary" onClick={() => set("params", [...t.params, "{student_first}"])}>+ Add blank</button>}
        <p className="text-xs text-muted">No blanks in the template? Remove them all.</p>
      </fieldset>
      <div><label className="label" htmlFor="m-media">Photo/video at the top (only if the AiSensy template has a media header)</label>
        <input id="m-media" className="input" value={t.media_url} onChange={(e) => set("media_url", e.target.value)} placeholder="https://…" /></div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={t.active} onChange={(e) => set("active", e.target.checked)} /> Can be sent</label>
        <span className="flex-1" />
        {msg && <span className="text-sm text-muted">{msg}</span>}
        {message && <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>}
        <button className="btn-primary" disabled={pending}>{message ? "Save" : "Add message"}</button>
      </div>
    </form>
  );
}
