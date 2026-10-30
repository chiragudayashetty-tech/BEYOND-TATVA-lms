import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import PlannerView from "./PlannerView";

export const metadata = { title: "Study Planner · Beyond Tatva" };

export default function PlannerPage() {
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Study Planner" subtitle="Plan short study blocks and tick them off. Small and daily beats long and rare." />
      <PlannerView />
    </Shell>
  );
}
