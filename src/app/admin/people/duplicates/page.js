import Shell from "@/components/shell/Shell";
import { Empty, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import DuplicateGroups from "./DuplicateGroups";

export const metadata = { title: "Duplicate accounts · Studio · Beyond Tatva" };

export default async function DuplicateReviewPage() {
  const { data, error } = await (await createClient()).rpc("admin_duplicate_candidates");
  const groups = Array.isArray(data) ? data : [];

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Duplicate accounts" subtitle="Review accounts that may belong to the same student. Merging keeps both logins working." />
      {error ? <div className="card"><Empty title="Duplicate review unavailable" body="We couldn't load duplicate accounts. Please try again." /></div>
        : groups.length ? <DuplicateGroups groups={groups} />
        : <div className="card"><Empty title="No duplicates found." body="Possible duplicate accounts will appear here for review." /></div>}
    </Shell>
  );
}
