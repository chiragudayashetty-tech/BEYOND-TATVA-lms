import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { getSession, isPreview } from "@/lib/supabase/server";
import UnlockView from "./UnlockView";

export const metadata = { title: "Unlock the course · Beyond Tatva" };

export default async function UnlockPage() {
  const [{ user, hasAccess }, course] = await Promise.all([getSession(), getCourse()]);
  return (
    <Shell roles={["student"]}>
      <PageTitle title={`Unlock ${course.title}`} subtitle="Module 0 (AI 101) is free. Unlock modules 1–6 with a school key, or enroll on our website." />
      <UnlockView price={course.price} hasAccess={hasAccess} preview={isPreview} enrollUrl={process.env.NEXT_PUBLIC_ENROLL_URL || "https://www.beyondtatva.in"} signedInAs={user?.email || user?.phone || ""} />
    </Shell>
  );
}
