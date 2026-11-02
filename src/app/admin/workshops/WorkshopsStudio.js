"use client";

import { useMemo, useState } from "react";
import { Check, Download, ExternalLink, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputTime = (iso) => iso ? new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 16) : "";
const safeCell = (value) => { const text = String(value ?? ""); return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`; };
const slugify = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export default function WorkshopsStudio({ workshops: initial, registrations, schools }) {
  const [workshops, setWorkshops] = useState(initial); const [registrationRows, setRegistrationRows] = useState(registrations); const [form, setForm] = useState({ title: "", slug: "", starts_at: "", venue: "", school_id: "", seats: 30 });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const grouped = useMemo(() => registrationRows.reduce((acc, item) => ((acc[item.workshop_id] ??= []).push(item), acc), {}), [registrationRows]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function save(event) {
    event.preventDefault(); setBusy(true); setError("");
    const row = { title: form.title.trim(), slug: slugify(form.slug || form.title), starts_at: new Date(`${form.starts_at}:00+05:30`).toISOString(), venue: form.venue.trim() || null, school_id: form.school_id || null, seats: Number(form.seats), published: false };
    const { data, error: saveError } = await createClient().from("workshops").insert(row).select("id, slug, title, starts_at, venue, school_id, seats, published").single();
    setBusy(false);
    if (saveError) return setError(saveError.message);
    setWorkshops((items) => [data, ...items]); setForm({ title: "", slug: "", starts_at: "", venue: "", school_id: "", seats: 30 });
  }

  async function patch(workshop, values) {
    setError(""); const { data, error: saveError } = await createClient().from("workshops").update(values).eq("id", workshop.id).select("id, slug, title, starts_at, venue, school_id, seats, published").single();
    if (saveError) setError(saveError.message); else setWorkshops((items) => items.map((item) => item.id === workshop.id ? data : item));
  }

  async function saveEdit(event, workshop) {
    event.preventDefault(); setBusy(true); setError("");
    const values = { title: editing.title.trim(), slug: slugify(editing.slug), starts_at: new Date(`${editing.starts_at}:00+05:30`).toISOString(), venue: editing.venue.trim() || null, school_id: editing.school_id || null, seats: Number(editing.seats) };
    const { data, error: saveError } = await createClient().from("workshops").update(values).eq("id", workshop.id).select("id, slug, title, starts_at, venue, school_id, seats, published").single();
    setBusy(false);
    if (saveError) setError(saveError.message); else { setWorkshops((items) => items.map((item) => item.id === workshop.id ? data : item)); setEditing(null); }
  }

  async function markAttendance(registration, attended) {
    const value = attended ? null : new Date().toISOString();
    const { data, error: saveError } = await createClient().from("workshop_registrations").update({ attended_at: value }).eq("id", registration.id).select("id, attended_at").single();
    if (saveError) setError(saveError.message);
    else setRegistrationRows((items) => items.map((item) => item.id === registration.id ? { ...item, attended_at: data.attended_at } : item));
  }

  function downloadCsv(workshop) {
    const rows = grouped[workshop.id] ?? [];
    const csv = [["Student", "Grade", "Parent", "Parent WhatsApp", "Attended"], ...rows.map((r) => [r.student_name, r.grade, r.parent_name, r.parent_phone, r.attended_at ? "yes" : "no"])].map((row) => row.map(safeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = Object.assign(document.createElement("a"), { href: url, download: `${workshop.slug}-attendees.csv` }); link.click(); URL.revokeObjectURL(url);
  }

  return <>
    <section className="card p-5"><h2 className="font-semibold">Create a workshop</h2><form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="block"><span className="label">Title</span><input required maxLength={120} className="input" value={form.title} onChange={update("title")} /></label>
      <label className="block"><span className="label">Signup link name</span><input maxLength={60} className="input" placeholder={slugify(form.title) || "ai-workshop"} value={form.slug} onChange={update("slug")} /><span className="text-xs text-muted">Link: /w/{slugify(form.slug || form.title) || "…"}</span></label>
      <label className="block"><span className="label">Date and time (India)</span><input required type="datetime-local" className="input" value={form.starts_at} onChange={update("starts_at")} /></label>
      <label className="block"><span className="label">Seats</span><input required type="number" min="1" max="1000" className="input" value={form.seats} onChange={update("seats")} /></label>
      <label className="block"><span className="label">Venue</span><input maxLength={160} className="input" value={form.venue} onChange={update("venue")} placeholder="School / venue" /></label>
      <label className="block"><span className="label">School (optional)</span><select className="input" value={form.school_id} onChange={update("school_id")}><option value="">No school selected</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
      <button disabled={busy} className="btn-primary min-h-11 sm:col-span-2"><Plus size={16} />{busy ? "Saving…" : "Create workshop"}</button>
    </form></section>
    {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {workshops.map((workshop) => {
      const attendees = grouped[workshop.id] ?? [];
      return <section key={workshop.id} className="card overflow-hidden">
        <div className="flex flex-wrap items-start gap-3 p-5"><div className="min-w-0 flex-1"><h2 className="font-semibold">{workshop.title}</h2><p className="mt-1 text-sm text-muted">{new Date(workshop.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}{workshop.venue ? ` · ${workshop.venue}` : ""} · {attendees.length}/{workshop.seats} seats</p><a className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm text-primary underline" href={`/w/${workshop.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open /w/{workshop.slug}</a></div>
          <button type="button" onClick={() => setEditing(editing?.id === workshop.id ? null : { id: workshop.id, title: workshop.title, slug: workshop.slug, starts_at: inputTime(workshop.starts_at), venue: workshop.venue ?? "", school_id: workshop.school_id ?? "", seats: workshop.seats })} className="btn-secondary min-h-11">{editing?.id === workshop.id ? "Close edit" : "Edit"}</button>
          <button type="button" onClick={() => patch(workshop, { published: !workshop.published })} className="btn-secondary min-h-11">{workshop.published ? "Published · unpublish" : "Publish signup"}</button>
          <button type="button" onClick={() => downloadCsv(workshop)} className="btn-secondary min-h-11"><Download size={16} /> CSV</button>
        </div>
        {editing?.id === workshop.id && <form onSubmit={(event) => saveEdit(event, workshop)} className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
          <label><span className="label">Title</span><input required maxLength={120} className="input" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label>
          <label><span className="label">Signup link name</span><input required maxLength={60} className="input" value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} /></label>
          <label><span className="label">Date and time (India)</span><input required type="datetime-local" className="input" value={editing.starts_at} onChange={(event) => setEditing({ ...editing, starts_at: event.target.value })} /></label>
          <label><span className="label">Seats</span><input required type="number" min="1" max="1000" className="input" value={editing.seats} onChange={(event) => setEditing({ ...editing, seats: event.target.value })} /></label>
          <label><span className="label">Venue</span><input maxLength={160} className="input" value={editing.venue} onChange={(event) => setEditing({ ...editing, venue: event.target.value })} /></label>
          <label><span className="label">School</span><select className="input" value={editing.school_id} onChange={(event) => setEditing({ ...editing, school_id: event.target.value })}><option value="">No school selected</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
          <button disabled={busy} className="btn-primary min-h-11 sm:col-span-2">{busy ? "Saving…" : "Save changes"}</button>
        </form>}
        {!attendees.length ? <p className="border-t border-border p-5 text-sm text-muted">No signups yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-surface-2"><tr><th className="p-3">Student</th><th className="p-3">Grade</th><th className="p-3">Parent</th><th className="p-3">WhatsApp</th><th className="p-3">Check-in</th></tr></thead><tbody>{attendees.map((registration) => <tr key={registration.id} className="border-t border-border"><td className="p-3">{registration.student_name}</td><td className="p-3">{registration.grade}</td><td className="p-3">{registration.parent_name}</td><td className="p-3">{registration.parent_phone}</td><td className="p-3"><button type="button" onClick={() => markAttendance(registration, Boolean(registration.attended_at))} className="btn-secondary min-h-11"><Check size={16} />{registration.attended_at ? "Checked in" : "Check in"}</button></td></tr>)}</tbody></table></div>}
      </section>;
    })}
  </>;
}
