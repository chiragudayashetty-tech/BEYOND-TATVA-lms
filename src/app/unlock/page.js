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
  // The one page where a free student is looking to unlock: check for a website purchase here.
  if (!hasAccess && !isPreview && session.profile?.role === "student") {
    const { data: claimed } = await (await createClient()).rpc("claim_purchases");
    hasAccess = claimed > 0;
  }
  // Interim UPI payments (until Razorpay): on when NEXT_PUBLIC_UPI_ID is set in Vercel.
  const upiId = process.env.NEXT_PUBLIC_UPI_ID;
  let upi = null;
  if (upiId && !hasAccess && session.profile?.role === "student") {
    const { data: pending } = isPreview ? { data: null } : await (await createClient()).from("upi_claims").select("id").eq("status", "pending").limit(1).maybeSingle();
    upi = { upiId, payee: process.env.NEXT_PUBLIC_UPI_NAME || "Beyond Tatva", note: `BT ${(session.profile?.full_name || "").slice(0, 20)}`.trim(), pending: Boolean(pending), userId: user?.id };
  }
  // Razorpay checkout inside the LMS: on when both Razorpay keys are set on the server.
  const razorpay = !hasAccess && session.profile?.role === "student" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? { name: session.profile?.full_name || "", email: user?.email || "", phone: user?.phone || "" }
    : null;
  return (
    <Shell roles={["student"]}>
      <PageTitle title={`Unlock ${course.title}`} subtitle="Module 0 (Introduction to the AI World, AI 101) is free. Unlock modules 1–5 with a school key or a one-time payment." />
      <UnlockView price={course.price} hasAccess={hasAccess} preview={isPreview} enrollUrl={process.env.NEXT_PUBLIC_ENROLL_URL || "https://www.beyondtatva.in"} signedInAs={user?.email || user?.phone || ""} upi={upi} razorpay={razorpay} />
    </Shell>
  );
}
