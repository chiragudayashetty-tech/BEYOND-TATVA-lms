import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard, Gift, LogIn } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { getSession, homeFor } from "@/lib/supabase/server";

export const metadata = { title: "Beyond Tatva · Learn" };

// The LMS front door. Marketing and payments live on the website (beyondtatva.in); this page only
// gets people into their account. Signed-in visitors go straight to their home screen.
export default async function Home() {
  const { user, profile } = await getSession();
  if (user) redirect(profile ? homeFor(profile.role) : "/onboarding");

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-6 text-center shadow-xl shadow-black/5 sm:p-8">
          <h1 className="text-2xl font-semibold">Welcome to Beyond Tatva</h1>
          <p className="mt-2 text-muted">Your AI course for Grades 8–10. Sign in to keep learning.</p>
          <Link href="/login" className="btn-primary mt-6 w-full py-3"><LogIn className="h-4 w-4" /> Sign in</Link>

          <div className="mt-6 space-y-3 text-left">
            <Link href="/login?next=/course" className="flex items-center gap-3 rounded-xl border border-border p-4 transition hover:bg-surface-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success"><Gift className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">New here? Start Module 0 free</span>
                <span className="text-sm text-muted">Sign in with Google or email: Module 0 is free.</span>
              </span>
              <ArrowRight className="h-4 w-4 text-subtle" />
            </Link>
            <Link href="/login?next=/unlock" className="flex items-center gap-3 rounded-xl border border-border p-4 transition hover:bg-surface-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><CreditCard className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Get the full course</span>
                <span className="text-sm text-muted">Sign in with Google, then pay once to unlock every module.</span>
              </span>
              <ArrowRight className="h-4 w-4 text-subtle" />
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted">Students under 18 need a parent or guardian&apos;s consent to join.</p>
      </div>
    </div>
  );
}
