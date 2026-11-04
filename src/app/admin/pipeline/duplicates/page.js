import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { COURSE_ID } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { DedupeButton, DeleteLeadButton } from "../LeadActions";

export const metadata = { title: "Duplicates · Studio · Beyond Tatva" };

const date = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function DuplicatesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_duplicates", { p_course: COURSE_ID });
  const groups = new Map();
  for (const r of data ?? []) {
    const key = `${r.match}:${r.match_key}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const leadCopies = [...groups.values()].filter((g) => g[0].match === "phone").reduce((n, g) => n + Math.max(0, g.filter((r) => r.kind === "lead").length - 1), 0);

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Duplicates" subtitle="People who appear more than once: same phone number (last 10 digits) or same email. Gmail addresses match even with dots or +tags.">
        <Link href="/admin/pipeline" className="btn-secondary"><ArrowLeft size={16} /> Pipeline</Link>
      </PageTitle>
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">Couldn&apos;t check duplicates: {error.message}</p>}

      <div className="mb-4 flex flex-wrap items-start gap-3">
        <DedupeButton count={leadCopies} />
        <p className="max-w-md text-xs text-muted">Keeps the oldest lead for each phone and deletes {leadCopies} extra lead cop{leadCopies === 1 ? "y" : "ies"}. Student accounts are never deleted here; use People for that.</p>
      </div>

      {groups.size === 0 ? (
        <Card><Empty icon={Users} title="No duplicates" body="Nobody shares a phone number or email right now." /></Card>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([key, rows]) => (
            <Card key={key} pad={false} title={`${rows[0].match === "phone" ? "Phone" : "Email"}: ${rows[0].match_key} (${rows.length})`}>
              <ul className="divide-y divide-border border-t border-border">
                {rows.map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.name || r.phone || r.email || "No name"}</div>
                      <div className="truncate text-xs text-muted">{[r.phone, r.email, r.source && `from ${r.source}`, date(r.created_at)].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={r.kind === "lead" ? "neutral" : "primary"}>{r.kind === "lead" ? "Website lead" : "Student account"}</Badge>
                      {r.kind === "lead" && <DeleteLeadButton leadId={r.id} name={r.name || r.phone} />}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
