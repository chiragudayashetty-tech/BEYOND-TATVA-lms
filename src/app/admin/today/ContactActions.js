"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, NotebookPen, Phone } from "lucide-react";
import { logContact } from "../actions";
import { addDays } from "@/lib/today";
import { OUTREACH_STATUSES } from "@/lib/outreach";

const PICKS = {
  school: OUTREACH_STATUSES,
  lead: ["Interested", "Call back", "No answer", "Will join", "Not interested"],
};
const CHANNELS = { school: ["call", "whatsapp", "visit"], lead: ["call", "whatsapp", "visit", "other"] };

// Call / WhatsApp / Log buttons for one school or lead, with the inline log form.
export default function ContactActions({ kind, id, tel, wa, today, status }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {tel && <a href={tel} className="btn-secondary min-h-11 px-3"><Phone size={16} /> Call</a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 px-3"><MessageCircle size={16} /> WhatsApp</a>}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-primary min-h-11 px-3"><NotebookPen size={16} /> Log</button>
      </div>
      {open && <LogForm kind={kind} id={id} today={today} status={status} onDone={() => setOpen(false)} />}
    </div>
  );
}

function LogForm({ kind, id, today, status, onDone }) {
  const [state, action, pending] = useActionState(logContact, null);
  const [nextStatus, setNextStatus] = useState("");
  const [nextDate, setNextDate] = useState("");
  const router = useRouter();
  useEffect(() => { if (state?.ok) { onDone(); router.refresh(); } }, [state, onDone, router]);
  return (
    <form action={action} className="mt-3 space-y-3 rounded-xl border border-border bg-surface-2 p-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className="label">How</legend>
        <div className="flex flex-wrap gap-2">
          {CHANNELS[kind].map((c, i) => (
            <label key={c} className="chip cursor-pointer bg-surface capitalize has-[:checked]:bg-primary has-[:checked]:text-white">
              <input type="radio" name="channel" value={c} defaultChecked={i === 0} className="sr-only" />{c === "whatsapp" ? "WhatsApp" : c}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block"><span className="label">What happened</span>
        <textarea name="note" maxLength={kind === "school" ? 500 : 1000} className="input min-h-20" placeholder="Short and factual, e.g. Principal asked for a demo" /></label>
      <label className="block"><span className="label">Status {status ? <span className="text-muted">(now: {status})</span> : null}</span>
        <input name="status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} maxLength={kind === "school" ? 80 : 300} className="input" placeholder="Leave empty to keep it" /></label>
      <div className="flex flex-wrap gap-2">
        {PICKS[kind].map((p) => <button key={p} type="button" onClick={() => setNextStatus(p)} className="chip bg-surface">{p}</button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Next step</span><input name="next_step" maxLength={300} className="input" placeholder="e.g. Send brochure" /></label>
        <label className="block"><span className="label">Next date</span>
          <input type="date" name="next_date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="input" />
          <span className="mt-2 flex gap-2">
            <button type="button" onClick={() => setNextDate(addDays(today, 2))} className="chip bg-surface">+2 days</button>
            <button type="button" onClick={() => setNextDate(addDays(today, 7))} className="chip bg-surface">+7 days</button>
          </span>
        </label>
      </div>
      {kind === "lead" && (
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="do_not_contact" className="h-5 w-5" /> Do not contact again</label>
      )}
      {state && !state.ok && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary min-h-11 flex-1">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onDone} className="btn-secondary min-h-11">Cancel</button>
      </div>
    </form>
  );
}
