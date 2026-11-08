"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const date = (value) => value
  ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
  : "–";
const value = (item) => item == null || item === "" ? "–" : item;

export default function DuplicateGroups({ groups }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function keepMain(main, extra) {
    const message = `${extra.email || extra.name} becomes an extra login. Their school, phone and leads move to ${main.email || main.name}. Lessons and quizzes done on the extra login stay there.`;
    if (!window.confirm(message)) return;
    setError("");
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("admin_mark_duplicate_account", {
        p_duplicate: extra.id,
        p_main: main.id,
      });
      if (rpcError) setError(rpcError.message);
      else router.refresh();
    });
  }

  function undo(extra) {
    setError("");
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("admin_unmark_duplicate", { p_duplicate: extra.id });
      if (rpcError) setError(rpcError.message);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {groups.map((group, index) => {
        const accounts = group.accounts ?? [];
        const merged = group.reason === "merged";
        const main = merged ? accounts.find((account) => !account.duplicate_of) ?? accounts[0] : null;
        const extra = merged ? accounts.find((account) => account.duplicate_of) ?? accounts.find((account) => account.id !== main?.id) : null;
        const siblingCheck = group.reason?.toLowerCase().includes("could be siblings");

        return (
          <Card key={`${group.reason}-${accounts.map((account) => account.id).sort().join("-") || index}`}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={siblingCheck ? "warning" : merged ? "success" : "primary"}>{group.reason}</Badge>
              {siblingCheck && <p className="text-sm text-warning">Check before merging: siblings often share a phone.</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((account) => {
                const isMain = merged && account.id === main?.id;
                const isExtra = merged && account.id === extra?.id;
                return (
                  <section key={account.id} className={`min-w-0 rounded-2xl border p-4 ${isMain ? "border-success/40 bg-success-soft/40" : isExtra ? "border-primary/30 bg-primary-soft/30" : "border-border bg-surface-2"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold">{value(account.name)}</h2>
                        <p className="break-all text-sm text-muted">{value(account.email)}</p>
                      </div>
                      {isMain && <Badge tone="success">Main</Badge>}
                      {isExtra && <Badge tone="primary">Extra login</Badge>}
                      <Badge tone={account.paid ? "success" : "neutral"}>{account.paid ? "Paid" : "Not paid"}</Badge>
                    </div>

                    <dl className="mt-4 space-y-2 text-sm">
                      <Detail label="Parent" value={account.parent} />
                      <Detail label="Parent phone" value={account.parent_phone} />
                      <Detail label="Student phone" value={account.student_phone} />
                      <Detail label="Grade" value={account.grade} />
                      <Detail label="School" value={account.school} />
                      <Detail label="Signed up" value={date(account.signed_up_at)} />
                      <Detail label="Last sign-in" value={date(account.last_sign_in_at)} />
                    </dl>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                      <Metric label="Leads" value={account.leads} />
                      <Metric label="Lessons" value={account.lessons} />
                      <Metric label="Quiz attempts" value={account.quiz_attempts} />
                      <Metric label="Minutes" value={account.minutes} />
                    </div>

                    {merged && isExtra ? (
                      <button type="button" disabled={pending} onClick={() => undo(account)} className="btn-secondary mt-4 w-full justify-center">
                        {pending ? "Saving…" : "Undo merge"}
                      </button>
                    ) : !merged && (
                      <button type="button" disabled={pending} onClick={() => keepMain(account, accounts.find((other) => other.id !== account.id))} className="btn-secondary mt-4 w-full justify-center">
                        {pending ? "Saving…" : "Keep this one as main"}
                      </button>
                    )}
                  </section>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Detail({ label, value: item }) {
  return <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2"><dt className="text-muted">{label}</dt><dd className="break-words font-medium">{value(item)}</dd></div>;
}

function Metric({ label, value: item }) {
  return <div className="rounded-xl bg-surface px-2 py-2"><div className="font-semibold tabular-nums">{value(item)}</div><div className="mt-0.5 text-muted">{label}</div></div>;
}
