"use client";

import { useState, useTransition } from "react";
import { retryMessage, saveAutomation, saveTemplate, sendNow } from "./actions";

export function RuleForm({ rule, templates = [] }) {
  const [campaign, setCampaign] = useState(rule.campaign ?? "");
  const [template, setTemplate] = useState(rule.template_key ?? "");
  const [enabled, setEnabled] = useState(rule.enabled);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const save = (on) =>
    start(async () => {
      const r = await saveAutomation(rule.key, campaign, on, template);
      if (r.ok) setEnabled(on);
      setMsg(r.ok ? "Saved" : r.error);
    });
  return (
    <div className="space-y-2">
      <label className="label" htmlFor={`t-${rule.key}`}>Template</label>
      <select id={`t-${rule.key}`} className="input" value={template} onChange={(e) => setTemplate(e.target.value)}>
        <option value="">— none (use campaign name below) —</option>
        {templates.map((t) => <option key={t.key} value={t.key}>{t.title} ({t.language})</option>)}
      </select>
      <label className="label" htmlFor={`c-${rule.key}`}>Or AiSensy campaign name</label>
      <div className="flex flex-wrap gap-2">
        <input id={`c-${rule.key}`} className="input min-w-0 flex-1" value={campaign} maxLength={100}
          placeholder="e.g. lms_welcome" onChange={(e) => setCampaign(e.target.value)} />
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => save(enabled)}>Save</button>
        <button type="button" className={enabled ? "btn-secondary" : "btn-primary"} disabled={pending} onClick={() => save(!enabled)}>
          {enabled ? "Switch off" : "Switch on"}
        </button>
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}

export function SendNow() {
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-muted">{msg}</span>}
      <button type="button" className="btn-primary" disabled={pending}
        onClick={() => start(async () => { const r = await sendNow(); setMsg(r.ok ? r.message : r.error); })}>
        {pending ? "Sending…" : "Send queued now"}
      </button>
    </div>
  );
}

export function Retry({ id }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <span className="text-xs text-muted">Queued</span>;
  return (
    <button type="button" className="text-xs font-medium text-primary underline" disabled={pending}
      onClick={() => start(async () => { const r = await retryMessage(id); setDone(r.ok); })}>Retry</button>
  );
}

const EMPTY = { key: "", title: "", campaign: "", language: "kn", category: "marketing", params: [], body: "", media_url: "", active: true };
export const PLACEHOLDERS = ["{parent_name}", "{student_name}", "{student_first}", "{school}", "{grade}", "{stage}"];

export function TemplateForm({ template }) {
  const [t, setT] = useState({ ...EMPTY, ...template, params: template?.params ?? [], media_url: template?.media_url ?? "" });
  const [open, setOpen] = useState(!template);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const set = (k) => (e) => setT({ ...t, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  if (!open) return <button type="button" className="text-sm font-medium text-primary underline" onClick={() => setOpen(true)}>Edit</button>;
  return (
    <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      start(async () => { const r = await saveTemplate({ ...t, params: t.params.filter(Boolean) }); setMsg(r.ok ? "Saved" : r.error); if (r.ok && !template) setT(EMPTY); });
    }}>
      <div><label className="label">Key</label><input className="input" required value={t.key} readOnly={Boolean(template)} onChange={set("key")} placeholder="a1_kn" /></div>
      <div><label className="label">Title</label><input className="input" required value={t.title} onChange={set("title")} placeholder="Workshop thank you" /></div>
      <div><label className="label">AiSensy API campaign name</label><input className="input" required value={t.campaign} onChange={set("campaign")} placeholder="A1_kn" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Language</label><select className="input" value={t.language} onChange={set("language")}><option value="kn">Kannada</option><option value="en">English</option></select></div>
        <div><label className="label">Type</label><select className="input" value={t.category} onChange={set("category")}><option value="marketing">Marketing</option><option value="utility">Utility</option></select></div>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Message text (preview only; paste what you submitted in AiSensy)</label>
        <textarea className="input min-h-24" value={t.body} onChange={set("body")} maxLength={1500} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Variables {"{{1}}, {{2}}…"} (one per line: a placeholder or fixed text)</label>
        <textarea className="input min-h-20 font-mono text-xs" value={t.params.join("\n")} onChange={(e) => setT({ ...t, params: e.target.value.split("\n").slice(0, 10) })} />
        <p className="text-xs text-muted">Placeholders: {PLACEHOLDERS.join(" ")}</p>
      </div>
      <div className="sm:col-span-2"><label className="label">Photo/video header link (optional, https://)</label><input className="input" value={t.media_url} onChange={set("media_url")} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.active} onChange={set("active")} /> Active</label>
      <div className="flex items-center gap-2 sm:justify-end">
        {msg && <span className="text-sm text-muted">{msg}</span>}
        {template && <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>}
        <button className="btn-primary" disabled={pending}>{template ? "Save" : "Add template"}</button>
      </div>
    </form>
  );
}
