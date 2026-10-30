import { Workflow } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Empty, PageTitle } from "@/components/ui";

export const metadata = { title: "Automations · Admin · Beyond Tatva" };

export default function AutomationsPage() {
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Automations" subtitle="Rules that run on their own." />
      <Empty icon={Workflow} title="Coming after the CRM"
        body="Premiere reminders by email and WhatsApp, nudges for inactive students, sign-ups synced to Google Sheets, and webhooks to any other tool." />
    </Shell>
  );
}
