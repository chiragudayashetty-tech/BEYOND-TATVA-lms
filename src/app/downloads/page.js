import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getSession } from "@/lib/supabase/server";
import DownloadsView from "./DownloadsView";

export const metadata = { title: "Downloads · Beyond Tatva" };

// Lessons saved on this device. This page is also what opens when there is no internet (public/sw.js),
// so it must not need any data from the server beyond who is signed in.
export default async function DownloadsPage() {
  const { user } = await getSession();
  return (
    <Shell roles={["student", "teacher"]}>
      <PageTitle title="Downloads" subtitle="Lessons saved on this device. They play without internet." />
      <DownloadsView userId={user?.id ?? null} />
    </Shell>
  );
}
