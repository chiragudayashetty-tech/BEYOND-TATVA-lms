import { School, Users } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Avatar, Badge, Card, Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { GrantButton, MoveAccess, NewClass, NewSchool } from "./PeopleForms";

export const metadata = { title: "Schools and people · Admin · Beyond Tatva" };

export default async function PeoplePage() {
  const supabase = await createClient();
  const [{ data: schools }, { data: classes }, { data: people }, { data: access }, { data: orders }] = await Promise.all([
    supabase.rpc("admin_schools"),
    supabase.from("classes").select("id, name, grade, school_id, teacher_id"),
    supabase.from("profiles").select("id, role, full_name, grade, school_id, school_name, guardian_phone, guardian_consent_at, created_at").order("created_at", { ascending: false }),
    supabase.from("course_access").select("student_id, source"),
    supabase.from("payment_orders").select("id, student_id, amount_paise, coupon_code, status, payment_id, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const schoolName = Object.fromEntries((schools ?? []).map((s) => [s.id, s.name]));
  const teachers = (people ?? []).filter((p) => p.role === "teacher");
  const teacherName = Object.fromEntries(teachers.map((t) => [t.id, t.full_name]));
  const accessBy = Object.fromEntries((access ?? []).map((a) => [a.student_id, a.source]));
  const students = (people ?? []).filter((p) => p.role === "student");
  const studentName = Object.fromEntries(students.map((s) => [s.id, s.full_name]));

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Schools and people" subtitle="School students join with a school code; individual students sign up without one. Teachers use the separate teacher code." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Schools">
          <NewSchool />
          <ul className="mt-5 divide-y divide-border">
            {(schools ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted">{s.city ?? "–"} · {s.students} students</div>
                </div>
                <div className="text-right text-xs">
                  <div>Student code <span className="font-mono font-semibold">{s.code}</span></div>
                  <div className="text-muted">Teacher code <span className="font-mono">{s.teacher_code}</span></div>
                </div>
              </li>
            ))}
            {!schools?.length && <li className="py-3 text-sm text-muted">No schools yet.</li>}
          </ul>
        </Card>

        <Card title="Classes">
          {schools?.length ? <NewClass schools={schools} teachers={teachers} /> : <p className="text-sm text-muted">Add a school first.</p>}
          <ul className="mt-5 divide-y divide-border">
            {(classes ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
                <div className="flex-1"><div className="font-semibold">{c.name}</div><div className="text-xs text-muted">{schoolName[c.school_id]}</div></div>
                <span className="text-muted">{teacherName[c.teacher_id] ?? "No teacher"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title={`Students (${students.length})`} className="mt-6" pad={false}>
        {students.length === 0 ? (
          <div className="p-5"><Empty icon={Users} title="No students yet" body="Students show up here as soon as they sign up." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-y border-border text-left text-xs uppercase tracking-wider text-subtle">
                <th className="px-5 py-3 font-medium">Student</th><th className="px-5 py-3 font-medium">School</th><th className="px-5 py-3 font-medium">Parent</th><th className="px-5 py-3 font-medium">Access</th>
              </tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={s.full_name} size="h-8 w-8 text-xs" /><div><div className="font-medium">{s.full_name}</div><div className="text-xs text-muted">Grade {s.grade}</div></div></div></td>
                    <td className="px-5 py-3 text-muted">{schoolName[s.school_id] ?? s.school_name ?? "–"}{!s.school_id && <div className="text-xs">Individual</div>}</td>
                    <td className="px-5 py-3"><div className="text-xs text-muted">{s.guardian_phone ?? "–"}</div>{s.guardian_consent_at ? <Badge tone="success">Linked</Badge> : <Badge tone="warning">Not linked</Badge>}</td>
                    <td className="px-5 py-3">{accessBy[s.id] ? <Badge tone="success">Full · {accessBy[s.id]}</Badge> : <GrantButton studentId={s.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Move access between accounts">
          <p className="mb-4 text-sm text-muted">If a student signed up twice, move their access (and payments) to the account they actually use.</p>
          {students.length ? <MoveAccess students={students.map((s) => ({ id: s.id, full_name: s.full_name, access: accessBy[s.id] ?? null }))} /> : <p className="text-sm text-muted">No students yet.</p>}
        </Card>
        <Card title="Recent payments" pad={false}>
          {orders?.length ? (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm"><tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-5 py-2.5"><div className="font-medium">{studentName[o.student_id] ?? "Deleted account"}</div><div className="font-mono text-xs text-muted">{o.payment_id ?? o.id}</div></td>
                    <td className="px-5 py-2.5 text-right">₹{(o.amount_paise / 100).toLocaleString("en-IN")}{o.coupon_code && <div className="text-xs text-muted">{o.coupon_code}</div>}</td>
                    <td className="px-5 py-2.5 text-right"><Badge tone={{ paid: "success", refunded: "warning", failed: "danger" }[o.status] ?? "neutral"}>{o.status}</Badge></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          ) : <p className="px-5 pb-5 text-sm text-muted">No online payments yet.</p>}
        </Card>
      </div>

      <Card title={`Parents and teachers (${(people ?? []).filter((p) => p.role === "parent" || p.role === "teacher").length})`} className="mt-6">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(people ?? []).filter((p) => p.role === "parent" || p.role === "teacher").map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Avatar name={p.full_name} size="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1 truncate text-sm font-medium">{p.full_name}</div>
              <Badge tone={p.role === "teacher" ? "primary" : "neutral"}><span className="capitalize">{p.role}</span></Badge>
            </li>
          ))}
        </ul>
        {!people?.some((p) => p.role === "parent" || p.role === "teacher") && <p className="text-sm text-muted"><School className="mr-1 inline h-4 w-4" />None yet.</p>}
      </Card>
    </Shell>
  );
}
