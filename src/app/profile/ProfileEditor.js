"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// RLS + column grants let a user update only their own full_name and avatar (checked live 2026-11-02).
const avatarColors = [
  { value: "blue", label: "Blue", className: "bg-primary text-primary-fg" },
  { value: "green", label: "Green", className: "bg-success text-white" },
  { value: "amber", label: "Amber", className: "bg-warning text-white" },
  { value: "purple", label: "Purple", className: "bg-purple-600 text-white" },
];

export function validDisplayName(name) {
  const value = name.trim();
  return value.length >= 2 && value.length <= 60 && /^[\p{L}\p{M} .'-]+$/u.test(value);
}

export default function ProfileEditor({ userId, fullName, avatar }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(fullName);
  const [color, setColor] = useState(avatarColors.some((item) => item.value === avatar) ? avatar : "blue");
  const [message, setMessage] = useState("");
  async function save(event) {
    event.preventDefault();
    if (!validDisplayName(name)) {
      setMessage("Use 2–60 letters, spaces, apostrophes, dots or hyphens.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await createClient().from("profiles").update({ full_name: name.trim(), avatar: color }).eq("id", userId);
    setBusy(false);
    if (error) return setMessage("We could not save your profile. Please try again.");
    setMessage("Profile saved.");
    router.refresh(); // new name in the top bar and sidebar
  }

  return (
    <div className="px-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center gap-4 py-3 text-left transition hover:bg-surface-2">
        <UserRound className="h-5 w-5 text-muted" strokeWidth={1.75} />
        <span className="flex-1 text-sm font-medium">Edit profile</span>
        {open ? <ChevronDown className="h-4 w-4 text-subtle" /> : <ChevronRight className="h-4 w-4 text-subtle" />}
      </button>
      {open && <form onSubmit={save} className="grid gap-4 border-t border-border py-4">
        <label><span className="label">Display name</span>
          <input className="input min-h-11" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoComplete="name" />
        </label>
        <fieldset>
          <legend className="label">Avatar colour</legend>
          <div className="flex flex-wrap gap-2">
            {avatarColors.map((option) => <label key={option.value} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${color === option.value ? "border-primary" : "border-border"}`}>
              <input type="radio" name="avatar-color" value={option.value} checked={color === option.value} onChange={() => setColor(option.value)} className="accent-primary" />
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${option.className}`} aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "?"}</span>
              {option.label}
            </label>)}
          </div>
        </fieldset>
        {!validDisplayName(name) && <p className="text-sm text-danger">Use 2–60 letters, spaces, apostrophes, dots or hyphens.</p>}
        {message && <p role="status" className="text-sm text-muted">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !validDisplayName(name)} className="btn-primary min-h-11">{busy ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setName(fullName); setOpen(false); setMessage(""); }} className="btn-secondary min-h-11">Cancel</button>
        </div>
      </form>}
    </div>
  );
}
