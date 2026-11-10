import Shell from "@/components/shell/Shell";
import Logo from "@/components/Logo";
import RazorpayPay from "./RazorpayPay";
import { hasPendingPurchase } from "@/lib/pending-purchase";
import { PageTitle } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { createClient, getSession, isPreview } from "@/lib/supabase/server";
import UnlockView from "./UnlockView";
import AppNoPurchase from "@/components/AppNoPurchase";

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
    name: session.profile?.full_name || user?.user_metadata?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    whatsapp: (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, ""),
  };
  // Just signed in with Google, no details yet: pay first, fill in the details right after.
  if (user && !session.profile && !isPreview) {
    const paid = await hasPendingPurchase(user.email);
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <section className="card p-6">
            <h1 className="text-xl font-semibold">Unlock {course.title}</h1>
            <p className="web-only mt-1 text-sm text-muted">One payment unlocks every module. After paying, we&apos;ll ask a few quick details and your course opens.</p>
            <AppNoPurchase className="mt-4" />
            {paid ? (
              <div className="mt-4 rounded-xl bg-success-soft p-4 text-sm text-success">
                <p className="font-semibold">Payment received ✓</p>
                <p className="mt-1">Fill in a few details and your course opens.</p>
                <a href="/onboarding?next=%2Fcourse" className="btn-primary mt-3 w-full">Continue</a>
              </div>
            ) : <div className="web-only"><RazorpayPay price={course.price} {...pay} /></div>}
          </section>
          <p className="mt-4 text-center text-sm text-muted">Got an access key from your school or from us on WhatsApp? <a href="/onboarding?next=%2Funlock%23key" className="font-medium text-primary">Enter it here</a></p>
          <p className="mt-2 text-center text-sm text-muted">Just want to try first? <a href="/onboarding?next=%2Fcourse" className="font-medium text-primary">Start Module 0 free</a></p>
        </div>
      </main>
    );
  }
  return (
    <Shell roles={["student"]}>
      <PageTitle title={`Unlock ${course.title}`} subtitle={<>Module 0 (Introduction to the AI World, AI 101) is free. Unlock modules 1–5 with <span className="web-only">a one-time payment or </span>an access key.</>} />
      <UnlockView price={course.price} hasAccess={hasAccess} preview={isPreview} pay={pay} />
    </Shell>
  );
}
