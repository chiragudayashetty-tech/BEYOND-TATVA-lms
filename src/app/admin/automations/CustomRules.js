"use client";

import { useState, useTransition } from "react";
import { deleteCustomRule, previewCustomRule, saveCustomRule } from "./actions";
import { M0, STAGES, TRIGGERS, UNITS, istToIso, isoToIst, joinDelay, splitDelay } from "@/lib/custom-rules";

const HOURS = Array.from({ length: 25 }, (_, h) => h);
const hourLabel = (h) => `${h % 12 || 12}${h < 12 || h === 24 ? " am" : " pm"}`;

// Build or edit one rule: when it fires, how long after, which hours, who gets it, which message.
export function CustomRuleForm({ rule, messages, schools }) {
  const start = splitDelay(rule?.delay_minutes ?? 0);
  const [t, setT] = useState({
    title: rule?.title ?? "", trigger: rule?.trigger ?? "signup", amount: start.amount, unit: start.unit,
    runAt: isoToIst(rule?.run_at), from: rule?.from_hour ?? 9, to: rule?.to_hour ?? 21, recipient: rule?.recipient ?? "parent",
    stage: rule?.aud_stage ?? "any", school: rule?.aud_school ?? "", grade: rule?.aud_grade ?? "", module: rule?.aud_module ?? "",
    m0: rule?.aud_m0 ?? "", past: rule?.include_past ?? false, template: rule?.template_key ?? "",
  });
  const [open, setOpen] = useState(!rule);
  const [msg, setMsg] = useState(null);
  const [pending, start_] = useTransition();
  const set = (k, v) => setT((x) => ({ ...x, [k]: v }));
  const isLead = t.trigger === "lead_added";
  const isDate = t.trigger === "date";

  if (!open) return <button type="button" className="text-sm font-medium text-primary underline" onClick={() => setOpen(true)}>Edit</button>;
  return (
    <form className="space-y-3 rounded-xl border border-border p-3" onSubmit={(e) => {
      e.preventDefault();
      if (isDate && !istToIso(t.runAt)) return setMsg("Pick the date and time.");
      start_(async () => {
        const r = await saveCustomRule({
          key: rule?.key ?? null, title: t.title, trigger: t.trigger, delay_minutes: joinDelay(t.amount, t.unit),
          run_at: isDate ? istToIso(t.runAt) : null, from_hour: Number(t.from), to_hour: Number(t.to), recipient: isLead ? "parent" : t.recipient,
          aud_stage: isLead && t.stage === "enrolled" ? "any" : t.stage, aud_school: t.school || null, aud_grade: t.grade || null,
          aud_module: t.trigger === "module_open" ? t.module || null : null, aud_m0: isLead || isDate ? null : t.m0 || null,
          include_past: t.past, template_key: t.template || null,
        });
        setMsg(r.ok ? "Saved. New rules start Off: switch it On when you are ready." : r.error);
        if (r.ok && rule) setOpen(false);
        if (r.ok && !rule) setT((x) => ({ ...x, title: "" }));
      });
    }}>
      <div><label className="label" htmlFor="r-title">Name (for you)</label>
        <input id="r-title" className="input" required maxLength={80} value={t.title} onChange={(e) => set("title", e.target.value)} placeholder="Day-2 reminder for Class 9" /></div>

      <fieldset className="space-y-2 rounded-xl bg-surface-2 p-3">
        <legend className="label px-1">1. When</legend>
        <select className="input" value={t.trigger} onChange={(e) => set("trigger", e.target.value)} aria-label="Trigger">
          {TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {isDate ? (
          <div><label className="label" htmlFor="r-run">Date and time (India time)</label>
            <input id="r-run" type="datetime-local" className="input" value={t.runAt} onChange={(e) => set("runAt", e.target.value)} /></div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Wait</span>
            <input type="number" min="0" max="9999" className="input w-24" value={t.amount} onChange={(e) => set("amount", e.target.value)} aria-label="Wait amount" />
            <select className="input w-32" value={t.unit} onChange={(e) => set("unit", e.target.value)} aria-label="Wait unit">{UNITS.map(([u]) => <option key={u}>{u}</option>)}</select>
            <span className="text-sm text-muted">first (0 = straight away)</span>
          </div>
        )}
        {t.trigger === "module_open" && (
          <select className="input" value={t.module} onChange={(e) => set("module", e.target.value)} aria-label="Which module">
            <option value="">Every module</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Module {n} only</option>)}
          </select>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Only send between</span>
          <select className="input w-28" value={t.from} onChange={(e) => set("from", e.target.value)} aria-label="From hour">{HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select>
          <span className="text-sm text-muted">and</span>
          <select className="input w-28" value={t.to} onChange={(e) => set("to", e.target.value)} aria-label="To hour">{HOURS.slice(1).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select>
          <span className="text-xs text-muted">(India time; the sender only runs 9 am–9 pm)</span>
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-xl bg-surface-2 p-3">
        <legend className="label px-1">2. Who</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {!isLead && (
            <div><label className="label" htmlFor="r-to">Send to</label>
              <select id="r-to" className="input" value={t.recipient} onChange={(e) => set("recipient", e.target.value)}>
                <option value="parent">Parent (parent&apos;s WhatsApp)</option><option value="student">Student (own number, else parent&apos;s)</option></select></div>
          )}
          <div><label className="label" htmlFor="r-stage">Stage</label>
            <select id="r-stage" className="input" value={t.stage} onChange={(e) => set("stage", e.target.value)}>
              {STAGES.filter(([v]) => !(isLead && v === "enrolled")).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label" htmlFor="r-school">School</label>
            <select id="r-school" className="input" value={t.school} onChange={(e) => set("school", e.target.value)}>
              <option value="">Any school</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label" htmlFor="r-grade">Class</label>
            <select id="r-grade" className="input" value={t.grade} onChange={(e) => set("grade", e.target.value)}>
              <option value="">Any class</option>{[8, 9, 10].map((g) => <option key={g} value={g}>Class {g}</option>)}</select></div>
          {!isLead && !isDate && (
            <div><label className="label" htmlFor="r-m0">Module 0 progress</label>
              <select id="r-m0" className="input" value={t.m0} onChange={(e) => set("m0", e.target.value)}>{M0.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          )}
        </div>
        <p className="text-xs text-muted">Checked at the moment of sending, so &quot;not enrolled yet&quot; drops anyone who joined in between. Test accounts and Do not contact numbers never get anything.</p>
      </fieldset>

      <fieldset className="space-y-2 rounded-xl bg-surface-2 p-3">
        <legend className="label px-1">3. Message</legend>
        <select className="input" value={t.template} onChange={(e) => set("template", e.target.value)} aria-label="Message">
          <option value="">— pick a message —</option>{messages.map((m) => <option key={m.key} value={m.key}>{m.title}</option>)}
        </select>
        {!isDate && (
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5" checked={t.past} onChange={(e) => set("past", e.target.checked)} />
            <span>Also include people already past this point (from the last 3 days). Leave unticked to only reach people from the moment you switch it On.</span></label>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1 text-sm text-muted">{msg}</span>
        {rule && <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>}
        <button className="btn-primary" disabled={pending}>{rule ? "Save" : "Add rule"}</button>
      </div>
    </form>
  );
}

// "Who would this reach?" without sending anything.
export function RulePreview({ ruleKey }) {
  const [r, setR] = useState(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" className="font-medium text-primary underline" disabled={pending}
        onClick={() => start(async () => setR(await previewCustomRule(ruleKey)))}>{pending ? "Counting…" : "Who would get this?"}</button>
      {r && (r.ok
        ? <span className="text-muted">{r.total} match · {r.dueNow} would go out now · {r.already} already got it</span>
        : <span className="text-danger">{r.error}</span>)}
    </div>
  );
}

export function DeleteRule({ ruleKey }) {
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="text-xs text-danger underline" disabled={pending}
        onClick={() => { if (confirm("Delete this rule?")) start(async () => { const r = await deleteCustomRule(ruleKey); if (!r.ok) setMsg(r.error); }); }}>Delete</button>
      {msg && <span className="text-xs text-danger">{msg}</span>}
    </span>
  );
}
