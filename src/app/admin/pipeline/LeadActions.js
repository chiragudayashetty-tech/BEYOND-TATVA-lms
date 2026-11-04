"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyX, Trash2 } from "lucide-react";
import { clearLeads, dedupeLeads, deleteLeads } from "@/app/admin/actions";

function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const go = (fn) => start(async () => {
    const res = await fn();
    setMsg(res.ok ? res.message : res.error);
    if (res.ok) router.refresh();
  });
  return { pending, msg, go };
}

// One lead (and any copies with the same phone). Student accounts are not touched.
export function DeleteLeadButton({ leadId, name }) {
  const { pending, msg, go } = useAction();
  if (!leadId) return null;
  return (
    <>
      <button type="button" disabled={pending} className="btn-secondary min-h-11 px-3 text-danger"
        onClick={() => { if (confirm(`Delete the lead "${name}"? Their notes are deleted too. A student account, if any, stays.`)) go(() => deleteLeads([leadId])); }}>
        <Trash2 size={16} /> {pending ? "Deleting…" : "Delete lead"}
      </button>
      {msg && <span role="status" className="text-[11px] text-muted">{msg}</span>}
    </>
  );
}

export function DedupeButton({ count }) {
  const { pending, msg, go } = useAction();
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={pending || count === 0} className="btn-secondary min-h-11"
        onClick={() => { if (confirm("Keep the oldest lead for each phone number and delete the extra copies?")) go(dedupeLeads); }}>
        <CopyX size={16} /> {pending ? "Removing…" : "Remove duplicate leads"}
      </button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </span>
  );
}

export function ClearLeadsButton({ source = null, label = "Clear all leads" }) {
  const { pending, msg, go } = useAction();
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={pending} className="btn-secondary min-h-11 text-danger"
        onClick={() => {
          const typed = prompt(`This deletes ${source ? `every "${source}" lead` : "every website lead, including school enquiries,"} and their notes. It can't be undone.\nStudent accounts stay.\n\nType DELETE ALL LEADS to confirm.`);
          if (typed !== null) go(() => clearLeads(typed.trim(), source));
        }}>
        <Trash2 size={16} /> {pending ? "Clearing…" : label}
      </button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
