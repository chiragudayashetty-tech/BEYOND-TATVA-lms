import { CheckCircle2, Clock, MessageCircle, XCircle } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient, isPreview, requireRole } from "@/lib/supabase/server";
import { RuleForm, Retry, SendNow, TemplateForm } from "./AutomationControls";

export const metadata = { title: "Automations · Admin · Beyond Tatva" };
export const dynamic = "force-dynamic";

const TONE = { sent: "success", failed: "danger", skipped: "neutral", queued: "warning", sending: "primary" };
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
const maskPhone = (p) => (p ? `${p.slice(0, 3)} ••••• ${p.slice(-4)}` : "");

export default async function AutomationsPage() {
  if (!isPreview) {
    const { profile } = await requireRole(["admin"]);
    if (profile?.role !== "admin") return null;
  }
  const supabase = await createClient();
  const dayAgo = hoursAgo(24);
  const [{ data: rules }, { data: recent }, { data: today }, { data: templates }] = await Promise.all([
    supabase.from("automation_rules").select("key, title, description, campaign, enabled, template_key").order("position"),
    supabase.from("message_queue").select("id, status, name, phone, error, created_at, sent_at, lead_id, automation_rules(title), wa_templates(title)")
      .order("created_at", { ascending: false }).limit(50),
    supabase.from("message_queue").select("status").gte("created_at", dayAgo).limit(2000),
    supabase.from("wa_templates").select("*").order("key"),
  ]);
  const count = (s) => (today ?? []).filter((m) => m.status === s).length;
  const keySet = Boolean(process.env.AISENSY_API_KEY);

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Automations" subtitle="WhatsApp messages sent by AiSensy when something happens in the LMS or the Leads sheet.">
        <SendNow />
      </PageTitle>
      {!keySet && (
        <Card className="mb-4 border-warning">
          <p className="text-sm"><strong>Not sending yet.</strong> Add <code>AISENSY_API_KEY</code> in Vercel (AiSensy → Manage → API key),
            create one API campaign per rule in AiSensy, then paste its name below and switch the rule on.</p>
        </Card>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Sent (24 h)" value={count("sent")} icon={CheckCircle2} tone="success" />
        <StatCard label="Waiting" value={count("queued") + count("sending")} icon={Clock} tone="warning" hint="Goes out 9am–9pm" />
        <StatCard label="Failed" value={count("failed")} icon={XCircle} tone="danger" />
        <StatCard label="Skipped" value={count("skipped")} icon={MessageCircle} tone="neutral" hint="Do not contact / too old" />
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {(rules ?? []).map((r) => (
          <Card key={r.key} title={r.title} action={<Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "On" : "Off"}</Badge>}>
            <p className="mb-3 text-sm text-muted">{r.description}</p>
            <RuleForm rule={r} templates={(templates ?? []).filter((t) => t.active)} />
          </Card>
        ))}
      </div>
      <div id="templates" className="mb-4">
        <Card title={`WhatsApp templates (${templates?.length ?? 0})`}>
          <p className="mb-3 text-sm text-muted">One row per AiSensy API campaign. Send any of them from Pipeline (one lead or a filtered group) or use them in the rules above.</p>
          <ul className="mb-4 divide-y divide-border">
            {(templates ?? []).map((t) => (
              <li key={t.key} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{t.title}</span>
                  <Badge tone="neutral">{t.language === "kn" ? "ಕನ್ನಡ" : "English"}</Badge>
                  <Badge tone={t.category === "utility" ? "primary" : "warning"}>{t.category}</Badge>
                  {!t.active && <Badge tone="neutral">inactive</Badge>}
                  <span className="text-xs text-muted">{t.campaign}</span>
                </div>
                <TemplateForm template={t} />
              </li>
            ))}
          </ul>
          <p className="mb-2 text-sm font-medium">Add a template</p>
          <TemplateForm />
        </Card>
      </div>
      <Card title="Last 50 messages" pad={false}>
        {!recent?.length ? (
          <Empty icon={MessageCircle} title="No messages yet" body="Switch a rule on; new events after that are queued here." />
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <Badge tone={TONE[m.status]}>{m.status}</Badge>
                <span className="font-medium">{m.wa_templates?.title ?? m.automation_rules?.title}</span>
                <span className="text-muted">{m.lead_id ? <a className="underline" href={`/admin/pipeline/lead/${m.lead_id}`}>{m.name || "—"}</a> : m.name || "—"} · {maskPhone(m.phone)}</span>
                <span className="ml-auto text-xs text-muted">{when(m.sent_at || m.created_at)}</span>
                {m.error && <span className="w-full text-xs text-danger">{m.error}</span>}
                {(m.status === "failed" || (m.status === "skipped" && m.error !== "Do not contact")) && <Retry id={m.id} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
