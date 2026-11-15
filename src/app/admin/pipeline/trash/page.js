import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { RestoreLeadButton } from "../LeadActions";

export const metadata = { title: "Trash · Pipeline · Studio · Beyond Tatva" };

const date = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const daysLeft = (t) => Math.max(0, 30 - Math.floor((Date.now() - new Date(t).getTime()) / 86_400_000));

export default async function LeadTrashPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_lead_trash");
  const rows = data ?? [];
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Trash" subtitle="Deleted and merged leads stay here for 30 days. Restore brings back the lead and its notes.">
        <Link href="/admin/pipeline" className="btn-secondary"><ArrowLeft size={16} /> Pipeline</Link>
      </PageTitle>
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">Couldn&apos;t load the trash: {error.message}</p>}
      {rows.length === 0 ? (
        <Card><Empty icon={Trash2} title="Trash is empty" body="Leads you delete or merge show up here for 30 days." /></Card>
      ) : (
        <Card pad={false} title={`In the trash (${rows.length})`}>
          <ul className="divide-y divide-border border-t border-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.name || r.phone}</div>
                  <div className="truncate text-xs text-muted">{[r.phone, r.school, r.source && `from ${r.source}`, r.notes ? `${r.notes} note${r.notes === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")}</div>
                  <div className="text-xs text-subtle">{r.reason[0].toUpperCase() + r.reason.slice(1)} · {date(r.deleted_at)} · {daysLeft(r.deleted_at)} days left</div>
                </div>
                <div className="flex flex-col items-end gap-1"><RestoreLeadButton id={r.id} /></div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Shell>
  );
}
