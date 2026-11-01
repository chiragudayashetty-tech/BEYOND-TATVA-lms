import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { createClient, getSession } from "@/lib/supabase/server";
import PlannerView from "./PlannerView";

export const metadata = { title: "Study Planner · Beyond Tatva" };

export default async function PlannerPage() {
  const { user, profile } = await getSession();
  // Students' plans are saved to their account; preview and non-student viewers keep them on the device.
  const synced = Boolean(user && user.id !== "preview" && profile?.role === "student");
  let serverPlan = {};
  if (synced) {
    const supabase = await createClient();
    const { data } = await supabase.from("study_plans").select("plan_date, items").eq("student_id", user.id);
    serverPlan = Object.fromEntries((data ?? []).map((r) => [r.plan_date, r.items]));
  }
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Study Planner" subtitle="Plan short study blocks and tick them off. Small and daily beats long and rare." />
      <PlannerView serverPlan={serverPlan} userId={synced ? user.id : null} />
    </Shell>
  );
}
