import { Workflow } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Empty, PageTitle } from "@/components/ui";

export const metadata = { title: "Automations · Admin · Beyond Tatva" };

export default function AutomationsPage() {
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Automations" subtitle="Rules that run on their own." />
      <Empty icon={Workflow} title="Automations are not set up yet"
        body="No email, WhatsApp or Sheets messages are being sent. Planned: welcome + how-to-log-in, a parent screen-time message, weekly module releases and certificate notices. Needs a WhatsApp provider, an email sender and parent opt-in wording first." />
    </Shell>
  );
}
