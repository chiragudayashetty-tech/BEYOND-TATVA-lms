import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { createClient, getSession, isPreview } from "@/lib/supabase/server";
import UnlockView from "./UnlockView";

export const metadata = { title: "Unlock the course · Beyond Tatva" };

export default async function UnlockPage() {
  const [session, course] = await Promise.all([getSession(), getCourse()]);
  const { user } = session;
  let { hasAccess } = session;
  // A purchase recorded by hand in Studio (or on the website) unlocks here.
  if (!hasAccess && !isPreview && session.profile?.role === "student") {
    const { data: claimed } = await (await createClient()).rpc("claim_purchases");
    hasAccess = claimed > 0;
  }
  const pay = {
    enabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    name: session.profile?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    whatsapp: (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, ""),
  };
  return (
    <Shell roles={["student"]}>
      <PageTitle title={`Unlock ${course.title}`} subtitle="Module 0 (Introduction to the AI World, AI 101) is free. Unlock modules 1–5 with a one-time payment or a school key." />
      <UnlockView price={course.price} hasAccess={hasAccess} preview={isPreview} pay={pay} />
    </Shell>
  );
}
