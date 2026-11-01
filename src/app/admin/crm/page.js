import { Contact } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Empty, PageTitle } from "@/components/ui";

export const metadata = { title: "CRM · Admin · Beyond Tatva" };

export default function CrmPage() {
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="CRM" subtitle="Track schools and parents from first contact to paid." />
      <Empty icon={Contact} title="CRM is not connected yet"
        body="No leads are being collected or synced here. Website (Loki) leads go to the Google Sheet for now. Planned: a pipeline for schools (lead, demo, proposal, won), parent enquiries, notes and follow-up reminders." />
    </Shell>
  );
}
