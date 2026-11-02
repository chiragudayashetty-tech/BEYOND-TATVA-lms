import { ReceiptText } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { DownloadCsv, MonthPicker } from "./reconcile-controls";

export const metadata = { title: "Reconciliation · Studio · Beyond Tatva" };

const statusLabel = { claimed: "Unlocked", pending: "Waiting", revoked: "Refunded" };
const statusTone = { claimed: "success", pending: "warning", revoked: "danger" };
const money = (paise) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = (value) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function monthRange(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");
  const now = new Date();
  const year = match ? Number(match[1]) : Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric" }).format(now));
  const month = match ? Number(match[2]) : Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", month: "numeric" }).format(now));
  const start = new Date(Date.UTC(year, month - 1, 1) - 330 * 60_000);
  const end = new Date(Date.UTC(year, month, 1) - 330 * 60_000);
  return { month: `${year}-${String(month).padStart(2, "0")}`, start: start.toISOString(), end: end.toISOString() };
}

export default async function ReconcilePage({ searchParams }) {
  const params = await searchParams;
  const range = monthRange(params?.month);
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchases").select("*")
    .gte("created_at", range.start).lt("created_at", range.end)
    .order("created_at", { ascending: false }).limit(2000);
  const rows = data ?? [];
  const count = (status) => rows.filter((row) => row.status === status).length;
  // Money received = everything not refunded (waiting payments are paid, just not linked to an account yet).
  const collected = rows.filter((row) => row.status !== "revoked").reduce((sum, row) => sum + (row.amount_paise ?? 0), 0);
  const website = rows.filter((row) => row.source === "website");
  const manual = rows.filter((row) => row.source === "manual");
  const now = new Date();
  const needsAttention = rows.filter((row) =>
    (row.status === "pending" && now.getTime() - new Date(row.created_at).getTime() > 24 * 60 * 60 * 1000)
    || (row.status === "pending" && row.suggested_student)
    || (row.source === "manual" && row.amount_paise == null));

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Payment reconciliation" subtitle="Review payments recorded this month. Amounts are shown in rupees; times use IST.">
        <MonthPicker month={range.month} />
      </PageTitle>
      {error && <p role="alert" className="mb-4 text-sm text-danger">Could not load payments. Please refresh the page.</p>}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paid / unlocked" value={count("claimed")} />
        <StatCard label="Waiting" value={count("pending")} />
        <StatCard label="Refunded" value={count("revoked")} />
        <StatCard label="Collected" value={money(collected)} hint="Paid and not refunded (unlocked + waiting)" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card title="By source">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted">Website</dt><dd className="mt-1 text-xl font-semibold">{website.length}</dd><dd className="text-xs text-muted">{countSource(website, "claimed")} unlocked</dd></div>
            <div><dt className="text-muted">Manual</dt><dd className="mt-1 text-xl font-semibold">{manual.length}</dd><dd className="text-xs text-muted">{countSource(manual, "claimed")} unlocked</dd></div>
          </dl>
        </Card>
        <Card title={`Needs attention (${needsAttention.length})`}>
          {needsAttention.length === 0 ? <p className="text-sm text-muted">Nothing needs a follow-up this month.</p> : (
            <ul className="divide-y divide-border">
              {needsAttention.map((row) => <li key={row.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{row.student_name || row.email || row.phone || "Unnamed payment"}</span>
                  <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{row.source === "manual" ? "Manual" : "Website"} · {date(row.created_at)}{row.amount_paise != null ? ` · ${money(row.amount_paise)}` : " · No amount recorded"}</p>
                {row.status === "pending" && row.suggested_student && <p className="mt-1 text-xs text-warning">A parent phone matched a student. Review this on Enrollments.</p>}
                {row.status === "pending" && now.getTime() - new Date(row.created_at).getTime() > 24 * 60 * 60 * 1000 && <p className="mt-1 text-xs text-warning">Waiting for more than 24 hours.</p>}
              </li>)}
            </ul>
          )}
        </Card>
      </div>
      <Card title={`All payments · ${rows.length}`} action={<DownloadCsv month={range.month} rows={rows} />} className="mt-6" pad={false}>
        {rows.length === 0 ? <div className="p-5"><Empty icon={ReceiptText} title="No payments this month" body="Payments recorded in this month will appear here." /></div> : (
          <ul className="divide-y divide-border border-t border-border">
            {rows.map((row) => <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{row.student_name || row.email || row.phone || "Unnamed payment"}</p><p className="text-xs text-muted">{row.source === "manual" ? "Manual" : "Website"} · {date(row.created_at)}{row.amount_paise != null ? ` · ${money(row.amount_paise)}` : " · Amount missing"}</p><p className="truncate font-mono text-[11px] text-subtle">{row.reference}</p></div>
              <Badge tone={statusTone[row.status]}>{statusLabel[row.status] ?? row.status}</Badge>
            </li>)}
          </ul>
        )}
      </Card>
    </Shell>
  );
}

function countSource(rows, status) { return rows.filter((row) => row.status === status).length; }
