"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquareText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const stamp = (value) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export function NotesButton({ person, notes = [] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const close = () => { setOpen(false); router.refresh(); }; // refresh counts and the follow-ups filter
  return <><button type="button" onClick={() => setOpen(true)} className="btn-secondary min-h-11 px-3"><MessageSquareText size={16} /> Notes ({notes.length})</button>{open && <NotesPanel person={person} notes={notes} onClose={close} />}</>;
}

function NotesPanel({ person, notes: initial, onClose }) {
  const [notes, setNotes] = useState(initial);
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dueNotes = useMemo(() => notes.filter((note) => note.follow_up_at && !note.done_at), [notes]);

  async function addNote(event) {
    event.preventDefault(); setBusy(true); setError("");
    const row = { student_id: person.student_id || null, lead_id: person.lead_id || null, body: body.trim(), channel: channel || null, follow_up_at: followUp ? new Date(followUp).toISOString() : null };
    const { data, error: saveError } = await createClient().from("crm_notes").insert(row).select("*").single();
    if (saveError) setError(saveError.message);
    else { setNotes((list) => [data, ...list]); setBody(""); setChannel(""); setFollowUp(""); }
    setBusy(false);
  }

  async function markDone(note) {
    const { data, error: saveError } = await createClient().from("crm_notes").update({ done_at: new Date().toISOString() }).eq("id", note.id).select("*").single();
    if (saveError) setError(saveError.message); else setNotes((list) => list.map((item) => item.id === note.id ? data : item));
  }

  return <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="crm-notes-title" className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:max-w-xl sm:rounded-2xl">
      <div className="flex items-center justify-between gap-3"><h2 id="crm-notes-title" className="text-lg font-semibold">Notes · {person.name}</h2><button type="button" onClick={onClose} aria-label="Close notes" className="flex h-11 w-11 items-center justify-center rounded-lg"><X /></button></div>
      <form onSubmit={addNote} className="mt-4 space-y-3">
        <label className="block"><span className="label">Note</span><textarea required minLength={1} maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} className="input min-h-24" placeholder="Keep notes short and factual" /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Channel (optional)</span><select value={channel} onChange={(event) => setChannel(event.target.value)} className="input"><option value="">Choose</option>{["call", "whatsapp", "email", "visit", "other"].map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="label">Follow-up time (India)</span><input type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="input" /></label></div>
        <button disabled={busy || !body.trim()} className="btn-primary w-full">{busy ? "Saving…" : "Add note"}</button>
      </form>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <ul className="mt-5 divide-y divide-border">{notes.map((note) => <li key={note.id} className="py-3"><div className="flex items-start justify-between gap-3"><p className="whitespace-pre-wrap text-sm">{note.body}</p>{dueNotes.includes(note) && <button type="button" onClick={() => markDone(note)} className="btn-secondary min-h-11 shrink-0 px-3"><Check size={16} /> Done</button>}</div><p className="mt-1 text-xs text-muted">{stamp(note.created_at)}{note.channel ? ` · ${note.channel}` : ""}</p>{note.follow_up_at && <p className="mt-1 text-xs text-primary">Follow-up: {stamp(note.follow_up_at)}{note.done_at ? " · done" : ""}</p>}</li>)}</ul>
      {!notes.length && <p className="py-5 text-sm text-muted">No notes yet.</p>}
    </section>
  </div>;
}
