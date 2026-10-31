import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Set up your account · Beyond Tatva" };

export default async function Onboarding({ searchParams }) {
  const { next } = await searchParams;
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile) redirect(safeNext ?? homeFor(profile.role));
  return <OnboardingForm defaultName={user.user_metadata?.full_name ?? ""} next={safeNext} />;
}
