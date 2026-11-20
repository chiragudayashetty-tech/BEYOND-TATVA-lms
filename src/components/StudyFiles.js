"use client";

import { Download, Eye, FileImage, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const ext = (f) => (f.mime === "application/pdf" ? "PDF" : (f.mime?.split("/")[1] ?? "FILE").toUpperCase().slice(0, 4));
// "Beyond-Tatva_Module_1_Notes.pdf" -> "Beyond Tatva Module 1 Notes"
export const prettyName = (t = "") => t.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

function track(resourceId, kind) {
  try {
    void createClient().rpc("log_resource_view", { p_resource_id: resourceId, p_kind: kind }).catch(() => {});
  } catch {
    // Links must keep working even when tracking is unavailable.
  }
}

// A study file as a tile: a document "thumbnail", a readable name, and View / Download buttons.
export default function StudyFiles({ files, trackable = true }) {
  if (!files?.length) return null;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {files.map((f) => {
        const pdf = f.mime === "application/pdf";
        const Icon = pdf ? FileText : FileImage;
        const name = prettyName(f.title);
        const log = (kind) => trackable && track(f.id, kind);
        return (
          <li key={f.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3">
            <span className={`relative grid h-16 w-12 shrink-0 place-items-center rounded-lg ${pdf ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"}`} aria-hidden="true">
              <Icon className="h-6 w-6" />
              <span className="absolute bottom-1 text-[9px] font-bold tracking-wide">{ext(f)}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-words text-sm font-semibold leading-snug" title={name}>{name}</p>
              {f.size_bytes ? <p className="mt-0.5 text-xs text-muted">{ext(f)} · {size(f.size_bytes)}</p> : null}
              <div className="mt-2 flex gap-2">
                {f.view && <a href={f.view} target="_blank" rel="noopener noreferrer" onClick={() => log("open")} aria-label={`Open ${name}`} className="btn-secondary min-h-10 flex-1 px-3 text-xs"><Eye className="h-4 w-4" /> Open</a>}
                {f.download && <a href={f.download} rel="noopener" onClick={() => log("download")} aria-label={`Download ${name}`} className="btn-ghost min-h-10 min-w-10 px-3 text-xs"><Download className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Save</span></a>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
