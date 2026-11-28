"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyX, FlaskConical, Merge, RotateCcw, Trash2 } from "lucide-react";
import { clearLeads, dedupeLeads, deleteLeads, mergeLeads, restoreLead, setTestAccount } from "@/app/admin/actions";

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
        onClick={() => { if (confirm(`Delete the lead "${name}"? It goes to the trash with its notes and can be restored for 30 days. A student account, if any, stays.`)) go(() => deleteLeads([leadId])); }}>
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
        onClick={() => { if (confirm("Keep the oldest lead for each phone number and move the extra copies to the trash (restorable for 30 days)?")) go(dedupeLeads); }}>
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
          const typed = prompt(`This deletes ${source ? `every "${source}" lead` : "every website lead, including school enquiries,"} and their notes. They stay in the trash for 30 days, then they're gone.\nStudent accounts stay.\n\nType DELETE ALL LEADS to confirm.`);
          if (typed !== null) go(() => clearLeads(typed.trim(), source));
        }}>
        <Trash2 size={16} /> {pending ? "Clearing…" : label}
      </button>
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </span>
  );
}

// Keep this lead and merge the other leads of the same group into it.
export function MergeIntoButton({ keepId, mergeIds, name }) {
  const { pending, msg, go } = useAction();
  if (!keepId || !mergeIds?.length) return null;
  return (
    <>
      <button type="button" disabled={pending} className="btn-secondary min-h-11 px-3"
        onClick={() => { if (confirm(`Keep "${name}" and merge ${mergeIds.length} other lead${mergeIds.length === 1 ? "" : "s"} into it? Empty fields are filled from the others and their notes move over. The others go to the trash (restorable for 30 days).`)) go(() => mergeLeads(keepId, mergeIds)); }}>
        <Merge size={16} /> {pending ? "Merging…" : "Keep this, merge others"}
      </button>
      {msg && <span role="status" className="text-[11px] text-muted">{msg}</span>}
    </>
  );
}

export function RestoreLeadButton({ id }) {
  const { pending, msg, go } = useAction();
  return (
    <>
      <button type="button" disabled={pending} className="btn-secondary min-h-11 px-3" onClick={() => go(() => restoreLead(id))}>
        <RotateCcw size={16} /> {pending ? "Restoring…" : "Restore"}
      </button>
      {msg && <span role="status" className="text-[11px] text-muted">{msg}</span>}
    </>
  );
}

// Signed-in students only: move between the real pipeline and the Test accounts tab.
export function TestAccountButton({ studentId, isTest, name }) {
  const { pending, msg, go } = useAction();
  if (!studentId) return null;
  return (
    <>
      <button type="button" disabled={pending} className="btn-secondary min-h-11 px-3"
        onClick={() => { if (confirm(isTest ? `Count "${name}" as a real student again?` : `Mark "${name}" as a test account? It moves to the Test accounts tab and stops counting in Studio numbers.`)) go(() => setTestAccount(studentId, !isTest)); }}>
        <FlaskConical size={16} /> {pending ? "Saving…" : isTest ? "Not a test" : "Mark as test"}
      </button>
      {msg && <span role="status" className="text-[11px] text-muted">{msg}</span>}
    </>
  );
}
