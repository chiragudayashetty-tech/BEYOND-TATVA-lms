import { UserCheck } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { AddEnrollment, ApproveButton, AssignForm, RevokeButton } from "./EnrollmentForms";
import UpiClaims from "./UpiClaims";

export const metadata = { title: "Enrollments · Studio · Beyond Tatva" };

const tone = { claimed: "success", pending: "warning", revoked: "danger" };
const label = { claimed: "Unlocked", pending: "Waiting for sign-in", revoked: "Refunded" };
const how = { email: "email", phone: "login phone", parent_phone: "parent phone", admin: "by you" };
const date = (t) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function EnrollmentsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: students }, { data: upiRows }] = await Promise.all([
    supabase.from("purchases").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("profiles").select("id, full_name, guardian_phone").eq("role", "student").order("full_name"),
    supabase.from("upi_claims").select("id, student_id, amount_paise, utr, payer_name, proof_path, created_at").eq("status", "pending").order("created_at"),
  ]);
  const name = Object.fromEntries((students ?? []).map((s) => [s.id, s.full_name]));
  const phone = Object.fromEntries((students ?? []).map((s) => [s.id, s.guardian_phone]));
  const proofPaths = (upiRows ?? []).map((c) => c.proof_path);
  const { data: signed } = proofPaths.length ? await supabase.storage.from("payment-proofs").createSignedUrls(proofPaths, 3600) : { data: [] };
  const proofUrl = Object.fromEntries((signed ?? []).map((x) => [x.path, x.signedUrl]));
  const upiClaims = (upiRows ?? []).map((c) => ({ ...c, student: name[c.student_id] ?? "Student", phone: phone[c.student_id], proof: proofUrl[c.proof_path] ?? null }));
  const list = rows ?? [];
  const count = (st) => list.filter((r) => r.status === st).length;

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Enrollments" subtitle="Everyone who paid. Website payments unlock on their own when the student signs in with the same verified email or phone. If only the parent's phone matches, approve it here." />
      <Card title={`UPI payments to check (${upiClaims.length})`} className="mb-6"><UpiClaims claims={upiClaims} /></Card>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card title="Add an enrollment"><AddEnrollment /></Card>

        <Card title={`All enrollments (${list.length})`} action={<span className="text-xs text-muted">{count("claimed")} unlocked · {count("pending")} waiting · {count("revoked")} refunded</span>} pad={false}>
          {list.length === 0 ? (
            <div className="p-5"><Empty icon={UserCheck} title="No enrollments yet" body="When someone pays on the website, they appear here." /></div>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {list.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{r.student_name ?? r.email ?? r.phone}</div>
                    <div className="truncate text-xs text-muted">
                      {[r.email, r.phone].filter(Boolean).join(" · ")} · {date(r.created_at)} · {r.source === "manual" ? "added by you" : "website"}
                      {r.amount_paise != null && ` · ₹${(r.amount_paise / 100).toLocaleString("en-IN")}`}
                    </div>
                    {r.status === "claimed" && <div className="text-xs text-muted">→ {name[r.claimed_by] ?? "deleted account"} (matched by {how[r.matched_by] ?? "?"})</div>}
                    {r.status === "pending" && r.suggested_student && <div className="text-xs text-warning">Parent phone matches {name[r.suggested_student] ?? "a student"}: needs your approval</div>}
                    <div className="font-mono text-[11px] text-subtle">{r.reference}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={tone[r.status]}>{label[r.status]}</Badge>
                    {r.status === "pending" && r.suggested_student && name[r.suggested_student] && <ApproveButton purchaseId={r.id} studentName={name[r.suggested_student]} />}
                    {r.status === "pending" && <AssignForm purchaseId={r.id} students={students ?? []} />}
                    {r.status !== "revoked" && <RevokeButton reference={r.reference} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Shell>
  );
}
