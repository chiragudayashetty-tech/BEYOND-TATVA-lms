"use client";

import { useState, useTransition } from "react";
import { retryMessage, saveAutomation, sendNow } from "./actions";

export function RuleForm({ rule }) {
  const [campaign, setCampaign] = useState(rule.campaign ?? "");
  const [enabled, setEnabled] = useState(rule.enabled);
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  const save = (on) =>
    start(async () => {
      const r = await saveAutomation(rule.key, campaign, on);
      if (r.ok) setEnabled(on);
      setMsg(r.ok ? "Saved" : r.error);
    });
  return (
    <div className="space-y-2">
      <label className="label" htmlFor={`c-${rule.key}`}>AiSensy campaign name</label>
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
