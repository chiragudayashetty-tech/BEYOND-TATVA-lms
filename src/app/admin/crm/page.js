import { Contact } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Empty, PageTitle } from "@/components/ui";

export const metadata = { title: "CRM · Admin · Beyond Tatva" };

export default function CrmPage() {
  return (
    <Shell roles={["admin"]}>
      <PageTitle title="CRM" subtitle="Track schools and parents from first contact to paid." />
      <Empty icon={Contact} title="Next up"
        body="A pipeline for schools (lead, demo, proposal, won), parent enquiries from the website, notes and follow-up reminders. Tell me which CRM you use today, if any, and I'll connect it or build this in." />
    </Shell>
  );
}
