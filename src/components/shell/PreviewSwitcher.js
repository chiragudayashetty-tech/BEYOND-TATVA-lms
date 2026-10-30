"use client";

import { useRouter } from "next/navigation";

const homes = { student: "/browse", parent: "/parent", teacher: "/teacher", admin: "/admin" };

// Local preview only: switch which role you're looking at. Never rendered in production.
export default function PreviewSwitcher({ role }) {
  const router = useRouter();
  const pick = (r) => {
    document.cookie = `preview_role=${r}; path=/; max-age=86400`;
    router.push(homes[r]);
    router.refresh();
  };
  return (
    <div className="fixed bottom-20 right-3 z-50 flex items-center gap-1 rounded-xl border border-border bg-surface p-1 text-xs shadow-lg lg:bottom-4 lg:right-4">
      <span className="px-2 font-medium text-subtle">Preview</span>
      {Object.keys(homes).map((r) => (
        <button key={r} onClick={() => pick(r)}
          className={`rounded-lg px-2.5 py-1.5 font-medium capitalize transition ${r === role ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2"}`}>
          {r}
        </button>
      ))}
    </div>
  );
}
