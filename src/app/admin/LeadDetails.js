import { Badge, Card } from "@/components/ui";

const date = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null);
const filled = (v) => v != null && String(v).trim() !== "";
const SOURCE = { tracker: "School Leads Tracker", v2: "School sheet", sheets: "School sheet" };

// What the school sheet and the lead record say about one person. Empty sheet cells are left out.
export default function LeadDetails({ lead, title }) {
  const main = [
    ["Student", lead.student_name], ["Parent", lead.parent_name], ["Parent phone", lead.phone],
    ["Class", lead.grade && `${lead.grade}${lead.section ? ` ${lead.section}` : ""}`], ["School", lead.school_name],
    ["Next step", lead.status], ["Note", lead.next_step], ["Next date", date(lead.next_date)],
    ["Source", lead.source], ["Added", date(lead.created_at)], ["Last updated", date(lead.updated_at)],
  ].filter(([, v]) => filled(v));
  const sheet = Object.entries(lead.sheet ?? {}).filter(([, v]) => filled(v)).sort(([a], [b]) => a.localeCompare(b));
  const extra = Object.entries(lead.details ?? {}).filter(([, v]) => filled(v) && typeof v !== "object");
  const Row = ([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs text-muted">{k}</dt><dd className="break-words font-medium">{String(v)}</dd></div>;
  return (
    <Card title={title ?? `From the ${SOURCE[lead.book] ?? "lead record"}`} action={lead.do_not_contact ? <Badge tone="danger">Do not contact</Badge> : null}>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">{main.map(Row)}</dl>
      {sheet.length > 0 && <>
        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Sheet columns</h3>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">{sheet.map(Row)}</dl>
      </>}
      {extra.length > 0 && <>
        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">From the website form</h3>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">{extra.map(Row)}</dl>
      </>}
      {sheet.length === 0 && <p className="mt-4 text-xs text-muted">No sheet columns filled in yet.</p>}
    </Card>
  );
}
