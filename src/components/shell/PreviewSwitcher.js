"use client";

import { useRouter } from "next/navigation";

const homes = { student: "/browse", parent: "/parent", teacher: "/teacher", admin: "/admin" };

// Local preview only: switch which role you're looking at. Never rendered in production.
export default function PreviewSwitcher({ role, hasAccess }) {
  const router = useRouter();
  const set = (k, v) => { document.cookie = `${k}=${v}; path=/; max-age=86400`; };
  const pick = (r) => { set("preview_role", r); router.push(homes[r]); router.refresh(); };
  return (
    <div className="fixed bottom-20 right-3 z-50 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface p-1 text-xs shadow-lg lg:bottom-4 lg:right-4">
      <span className="px-2 font-medium text-subtle">Preview</span>
      {Object.keys(homes).map((r) => (
        <button key={r} onClick={() => pick(r)}
          className={`rounded-lg px-2.5 py-1.5 font-medium capitalize transition ${r === role ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2"}`}>
          {r}
        </button>
      ))}
      {role === "student" && (
        <button onClick={() => { set("preview_access", hasAccess ? "0" : "1"); router.refresh(); }}
          className="ml-1 rounded-lg border border-border px-2.5 py-1.5 font-medium text-muted hover:bg-surface-2">
          {hasAccess ? "Unlocked" : "Free only"}
        </button>
      )}
    </div>
  );
}
