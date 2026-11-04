"use client";

import { useState } from "react";
import { Download, Eye, FileText, Image as ImageIcon } from "lucide-react";

const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// A module's attachments: view or download each file, or download them all one after another.
export default function ModuleResources({ files }) {
  const [busy, setBusy] = useState(false);
  if (!files?.length) return null;
  async function downloadAll() {
    setBusy(true);
    for (const f of files) {
      if (!f.download) continue;
      const a = Object.assign(document.createElement("a"), { href: f.download, rel: "noopener" });
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise((r) => setTimeout(r, 700)); // browsers block many downloads fired at once
    }
    setBusy(false);
  }
  return (
    <div className="mt-3 rounded-2xl bg-surface-2 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Attachments ({files.length})</span>
        {files.length > 1 && <button type="button" onClick={downloadAll} disabled={busy} className="btn-secondary min-h-11 px-3 text-sm"><Download className="h-4 w-4" /> {busy ? "Downloading…" : "Download all"}</button>}
      </div>
      <ul className="space-y-2">
        {files.map((f) => {
          const Icon = f.mime === "application/pdf" ? FileText : ImageIcon;
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface p-2 pl-3">
              <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 basis-40 truncate text-sm font-medium">{f.title} <span className="font-normal text-muted">· {size(f.size_bytes)}</span></span>
              {f.view && <a href={f.view} target="_blank" rel="noopener noreferrer" aria-label={`View ${f.title}`} className="btn-ghost min-h-11 px-3 text-sm"><Eye className="h-4 w-4" /> View</a>}
              {f.download && <a href={f.download} rel="noopener" aria-label={`Download ${f.title}`} className="btn-ghost min-h-11 px-3 text-sm"><Download className="h-4 w-4" /> Download</a>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
