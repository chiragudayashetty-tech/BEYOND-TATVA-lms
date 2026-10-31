import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { getSession, isPreview } from "@/lib/supabase/server";
import UnlockView from "./UnlockView";

export const metadata = { title: "Unlock the course · Beyond Tatva" };

export default async function UnlockPage({ searchParams }) {
  const { coupon } = await searchParams;
  const [{ hasAccess }, course] = await Promise.all([getSession(), getCourse()]);
  return (
    <Shell roles={["student"]}>
      <PageTitle title={`Unlock ${course.title}`} subtitle="Module 0 (AI 101) is free. Unlock modules 1–6 with a school key or a one-time payment." />
      <UnlockView price={course.price} hasAccess={hasAccess} preview={isPreview} initialCoupon={typeof coupon === "string" ? coupon.slice(0, 32) : ""} />
    </Shell>
  );
}
