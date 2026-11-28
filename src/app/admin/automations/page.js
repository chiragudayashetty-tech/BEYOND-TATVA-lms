import Link from "next/link";
import { CheckCircle2, Clock, MessageCircle, XCircle } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, StatCard } from "@/components/ui";
import { createClient, isPreview, requireRole } from "@/lib/supabase/server";
import { MessageForm, Retry, RuleSwitch, SendNow } from "./AutomationControls";
import { blankLabel } from "@/lib/wa-blanks";
import { CustomRuleForm, DeleteRule, RulePreview } from "./CustomRules";
import { describeRule } from "@/lib/custom-rules";

// Studio → WhatsApp. Templates are written and approved in AiSensy; here: which AiSensy campaign is which
// message, what is sent automatically, and what happened (sent / failed; delivered, read and replies stay in AiSensy).
export const metadata = { title: "WhatsApp · Studio · Beyond Tatva" };
export const dynamic = "force-dynamic";

const TABS = [["messages", "Messages"], ["auto", "Auto-send"], ["rules", "Your rules"], ["history", "History"]];
const STATUS = { sent: ["success", "Sent"], failed: ["danger", "Failed"], skipped: ["neutral", "Not sent"], optout: ["warning", "Opted out"], queued: ["warning", "Waiting"], sending: ["primary", "Sending"] };
const FILTERS = [["", "All"], ["sent", "Sent"], ["failed", "Failed"], ["optout", "Opted out"], ["waiting", "Waiting"], ["skipped", "Not sent"]];
const TRIGGER = {
  lead_welcome: "When a new lead is added (sheet, website, Loki chat)",
  payment_link: "When a lead's Next step says \"payment link\"",
  payment_received: "When a payment comes in",
  student_welcome: "When a new student finishes sign-up (to the parent)",
};
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const daysAgo = (d) => new Date(Date.now() - d * 86400_000).toISOString();
const maskPhone = (p) => (p ? `${p.slice(0, 3)} ••••• ${p.slice(-4)}` : "");

export default async function WhatsAppPage({ searchParams }) {
  const sp = await searchParams;
  const tab = TABS.some(([t]) => t === sp?.tab) ? sp.tab : "messages";
  const filter = FILTERS.some(([f]) => f === sp?.status) ? sp.status : "";
  if (!isPreview) {
    const { profile } = await requireRole(["admin"]);
    if (profile?.role !== "admin") return null;
  }
  const supabase = await createClient();
  let history = supabase.from("message_queue")
    .select("id, status, name, phone, error, created_at, sent_at, lead_id, attributes, template_key, wa_templates(title), automation_rules(title)")
    .order("created_at", { ascending: false }).limit(100);
  if (filter === "waiting") history = history.in("status", ["queued", "sending"]);
  else if (filter === "optout") history = history.eq("status", "skipped").like("error", "Opted out%");
  else if (filter) history = history.eq("status", filter);
  const [{ data: messages, error: setupError }, { data: allRules }, { data: schools }, { data: week }, { data: rows }, { data: optin }] = await Promise.all([
    supabase.from("wa_templates").select("*").order("title"),
    supabase.from("automation_rules").select("*").order("position"),
    tab === "rules" ? supabase.from("schools").select("id, name").order("name") : Promise.resolve({ data: [] }),
    supabase.from("message_queue").select("status, template_key").gte("created_at", daysAgo(7)).limit(5000),
    tab === "history" ? history : Promise.resolve({ data: [] }),
    supabase.rpc("wa_optin_stats"),
  ]);
  const rules = (allRules ?? []).filter((r) => !r.custom);
  const customRules = (allRules ?? []).filter((r) => r.custom).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const opt = optin?.[0] ?? { opted_in: 0, opted_out: 0, opted_out_whatsapp: 0 };
  const notReady = Boolean(setupError);
  const count = (s, key) => (week ?? []).filter((m) => (Array.isArray(s) ? s.includes(m.status) : m.status === s) && (!key || m.template_key === key)).length;
  const active = (messages ?? []).filter((m) => m.active);

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="WhatsApp" subtitle="Messages go out through AiSensy. Write and approve templates in AiSensy; link them here.">
        <SendNow />
      </PageTitle>

      {notReady && <p role="alert" className="mb-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">Not switched on yet: Claude still has to add the WhatsApp tables to the live database (you say &quot;apply automations&quot;).</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Sent (7 days)" value={count("sent")} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={count("failed")} icon={XCircle} tone="danger" />
        <StatCard label="Waiting" value={count(["queued", "sending"])} icon={Clock} tone="warning" hint="Sends 9am–9pm" />
        <StatCard label="Not sent" value={count("skipped")} icon={MessageCircle} tone="neutral" hint="Opted out / do not contact / too old" />
      </div>

      <Card className="mb-4" title="Opt-in / opt-out">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-2xl font-semibold text-success">{opt.opted_in}</p><p className="text-xs text-muted">Can message</p></div>
          <div><p className="text-2xl font-semibold text-danger">{opt.opted_out}</p><p className="text-xs text-muted">Do not contact</p></div>
          <div><p className="text-2xl font-semibold text-warning">{opt.opted_out_whatsapp}</p><p className="text-xs text-muted">Said STOP on WhatsApp</p></div>
        </div>
        <p className="mt-3 text-xs text-muted">Do not contact = ticked in the sheet or Studio, or caught when AiSensy refused a message because the parent opted out. Those leads are marked automatically. Opted back in (START)? Untick Do not contact in the sheet.</p>
      </Card>

      <div className="mb-4 flex gap-2" role="tablist">
        {TABS.map(([id, label]) => (
          <Link key={id} href={`/admin/automations${id === "messages" ? "" : `?tab=${id}`}`} role="tab" aria-selected={tab === id}
            className={`${tab === id ? "btn-primary" : "btn-secondary"} min-h-11`}>{label}</Link>
        ))}
      </div>

      {tab === "messages" && (
        <div className="space-y-3">
          <Card>
            <p className="text-sm text-muted">For each approved template in AiSensy: make an <b>API campaign</b>, set it <b>Live</b>, then add it here with the same campaign name.
              Send messages by hand from <Link href="/admin/pipeline" className="text-primary underline">Pipeline</Link> (a whole filter) or a lead&apos;s page.</p>
          </Card>
          {(messages ?? []).map((m) => (
            <Card key={m.key} title={m.title} action={<Badge tone={m.active ? "success" : "neutral"}>{m.active ? "Ready" : "Off"}</Badge>}>
              <p className="text-sm">AiSensy campaign <code className="rounded bg-surface-2 px-1">{m.campaign}</code> · {m.language === "kn" ? "Kannada" : "English"} · {m.category}{m.media_url ? " · with photo/video" : ""}</p>
              <p className="mt-1 text-sm text-muted">{m.params?.length ? m.params.map((p, i) => `{{${i + 1}}} ${blankLabel(p)}`).join(" · ") : "No blanks"}</p>
              <p className="mt-1 text-xs text-muted">This week: {count("sent", m.key)} sent · {count("failed", m.key)} failed</p>
              <div className="mt-2"><MessageForm message={m} /></div>
            </Card>
          ))}
          {!notReady && <Card title="Add a message"><MessageForm /></Card>}
        </div>
      )}

      {tab === "auto" && (
        <div className="space-y-3">
          {!active.length && !notReady && <Card><p className="text-sm text-muted">Add a message first (Messages tab).</p></Card>}
          {rules.map((r) => (
            <Card key={r.key} title={TRIGGER[r.key] ?? r.title}>
              <RuleSwitch rule={r} messages={active} />
            </Card>
          ))}
          <p className="text-xs text-muted">Each person gets each automatic message once. Nothing goes to Do not contact numbers or between 9pm and 9am.</p>
        </div>
      )}

      {tab === "rules" && (
        <div className="space-y-3">
          <Card>
            <p className="text-sm text-muted">Build your own automatic messages: choose <b>when</b> it fires, <b>how long after</b>, <b>which hours</b>, <b>who</b> gets it and <b>which message</b>.
              New rules start Off. Each person gets a rule&apos;s message once. The built-in journey stays in the <Link href="/admin/automations?tab=auto" className="text-primary underline">Auto-send</Link> tab; switch a built-in Off if your rule replaces it.</p>
          </Card>
          {customRules.map((r) => (
            <Card key={r.key} title={r.title} action={<Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "On" : "Off"}</Badge>}>
              <p className="mb-2 text-sm">{describeRule(r, (schools ?? []).find((s) => s.id === r.aud_school)?.name)}</p>
              <RuleSwitch rule={r} messages={active} />
              <div className="mt-2 flex flex-wrap items-center gap-3"><RulePreview ruleKey={r.key} /><DeleteRule ruleKey={r.key} /></div>
              <div className="mt-2"><CustomRuleForm rule={r} messages={active} schools={schools ?? []} /></div>
            </Card>
          ))}
          {!notReady && <Card title="Add a rule"><CustomRuleForm messages={active} schools={schools ?? []} /></Card>}
        </div>
      )}

      {tab === "history" && (
        <Card pad={false} title="Last 100 messages">
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {FILTERS.map(([f, label]) => (
              <Link key={f} href={`/admin/automations?tab=history${f ? `&status=${f}` : ""}`} className={`${filter === f ? "btn-primary" : "btn-secondary"} min-h-9 px-3 py-1 text-sm`}>{label}</Link>
            ))}
          </div>
          {!rows?.length ? <Empty icon={MessageCircle} title="Nothing here yet" body="Sent and failed messages show up here." /> : (
            <ul className="divide-y divide-border">
              {rows.map((m) => {
                const [tone, label] = STATUS[m.status === "skipped" && m.error?.startsWith("Opted out") ? "optout" : m.status] ?? ["neutral", m.status];
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                    <Badge tone={tone}>{label}</Badge>
                    <span className="font-medium">{m.wa_templates?.title ?? m.automation_rules?.title}</span>
                    <span className="text-muted">→ {m.lead_id ? <Link className="underline" href={`/admin/pipeline/lead/${m.lead_id}`}>{m.name || "—"}</Link> : m.name || "—"}
                      {m.attributes?.school ? ` (${m.attributes.school})` : ""} · {maskPhone(m.phone)}</span>
                    <span className="ml-auto text-xs text-muted">{when(m.sent_at || m.created_at)}</span>
                    {m.error && <span className="w-full text-xs text-danger">{m.error}</span>}
                    {(m.status === "failed" || (m.status === "skipped" && m.error !== "Do not contact" && !m.error?.startsWith("Opted out"))) && <Retry id={m.id} />}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="px-4 py-3 text-xs text-muted">Delivered, read and replies: AiSensy → Campaigns (report) and Chats.</p>
        </Card>
      )}
    </Shell>
  );
}
