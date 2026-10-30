import { KeyRound } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { COURSE_ID } from "@/lib/catalog";
import { createClient, isPreview } from "@/lib/supabase/server";
import KeyGenerator from "../KeyGenerator";

export const metadata = { title: "Access keys · Admin · Beyond Tatva" };

export default async function AccessPage() {
  const supabase = await createClient();
  const { data: keys } = await supabase
    .from("access_keys")
    .select("code, label, created_at, redeemed_at, redeemed_by")
    .order("created_at", { ascending: false })
    .limit(500);
  const ids = [...new Set((keys ?? []).map((k) => k.redeemed_by).filter(Boolean))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const names = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name]));

  const batches = Object.entries(
    (keys ?? []).reduce((acc, k) => ((acc[k.label ?? "No batch name"] ??= []).push(k), acc), {}),
  );

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Access keys" subtitle="One key per student. A key unlocks every paid module for the student who redeems it." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card title="Create keys">
          <KeyGenerator courseId={COURSE_ID} preview={isPreview} />
        </Card>

        <div className="space-y-4">
          {batches.length === 0 ? (
            <Empty icon={KeyRound} title="No keys yet" body="Create a batch for a school's class, then download the CSV and share one key with each student." />
          ) : batches.map(([label, list]) => {
            const used = list.filter((k) => k.redeemed_by).length;
            return (
              <Card key={label} title={label} action={<Badge tone={used === list.length ? "success" : "primary"}>{used} / {list.length} used</Badge>} pad={false}>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {list.map((k) => (
                        <tr key={k.code} className="border-t border-border">
                          <td className="px-5 py-2.5 font-mono">{k.code}</td>
                          <td className="px-5 py-2.5 text-right">
                            {k.redeemed_by
                              ? <span className="text-muted">{names[k.redeemed_by] ?? "Student"} · {new Date(k.redeemed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                              : <Badge>Unused</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
