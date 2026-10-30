import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { PRICE_INR } from "@/lib/catalog";
import { getSession, isPreview } from "@/lib/supabase/server";
import UnlockView from "./UnlockView";

export const metadata = { title: "Unlock the course · Beyond Tatva" };

export default async function UnlockPage() {
  const { hasAccess } = await getSession();
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Unlock AI for Students" subtitle="Module 0 (AI 101) is free. Unlock modules 1–6 with a school key or a one-time payment." />
      <UnlockView price={PRICE_INR} hasAccess={hasAccess} preview={isPreview} />
    </Shell>
  );
}
