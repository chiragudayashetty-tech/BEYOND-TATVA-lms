import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, PageTitle } from "@/components/ui";
import { createClient, requireRole } from "@/lib/supabase/server";
import LeadDetails from "../../../LeadDetails";
import { NotesButton } from "../../CrmNotes";
import { Badge } from "@/components/ui";
import SendWhatsApp from "@/components/whatsapp/SendWhatsApp";

export const metadata = { title: "Lead · Pipeline · Studio · Beyond Tatva" };

const when = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function LeadPage({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [{ data: lead }, { data: notes }, { data: templates }, { data: messages }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("crm_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("wa_templates").select("key, title, language, category, params, body, active").order("key"),
    supabase.from("message_queue").select("id, status, error, created_at, sent_at, wa_templates(title), automation_rules(title)")
      .eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (!lead) notFound();
  const name = lead.student_name || lead.parent_name || lead.phone;
  return (
    <Shell roles={["admin"]}>
      <PageTitle title={name} subtitle={[lead.school_name, lead.grade && `Class ${lead.grade}${lead.section ? ` ${lead.section}` : ""}`, "Lead"].filter(Boolean).join(" · ")}>
        <Link href="/admin/pipeline" className="btn-secondary"><ArrowLeft size={16} /> Pipeline</Link>
        {lead.student_id && <Link href={`/admin/analytics/students/${lead.student_id}`} className="btn-primary"><UserRound size={16} /> Student account</Link>}
      </PageTitle>
      <div className="space-y-5">
        <LeadDetails lead={lead} />
        <Card title={`WhatsApp (${messages?.length ?? 0})`} action={lead.do_not_contact ? <Badge tone="danger">Do not contact</Badge> : null}>
          {!lead.do_not_contact && <div className="mb-3"><SendWhatsApp templates={templates ?? []} targets={[{ lead_id: lead.id, student_id: lead.student_id }]} /></div>}
          {messages?.length ? <ul className="divide-y divide-border">{messages.map((m) => <li key={m.id} className="py-2 text-sm"><p><span className="font-medium">{m.wa_templates?.title ?? m.automation_rules?.title}</span> · {m.status}</p><p className="text-xs text-muted">{[when(m.sent_at ?? m.created_at), m.error].filter(Boolean).join(" · ")}</p></li>)}</ul>
            : <p className="text-sm text-muted">No WhatsApp messages yet.</p>}
        </Card>
        <Card title={`Notes (${notes?.length ?? 0})`} action={<NotesButton person={{ lead_id: lead.id, student_id: lead.student_id, name }} notes={notes ?? []} />}>
          {notes?.length ? <ul className="divide-y divide-border">{notes.map((n) => <li key={n.id} className="py-2 text-sm"><p>{n.body}</p><p className="text-xs text-muted">{[n.channel, when(n.created_at), n.follow_up_at && `Follow up ${when(n.follow_up_at)}`].filter(Boolean).join(" · ")}</p></li>)}</ul>
            : <p className="text-sm text-muted">No notes yet.</p>}
        </Card>
      </div>
    </Shell>
  );
}
