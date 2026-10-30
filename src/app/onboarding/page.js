import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Set up your account · Beyond Tatva" };

export default async function Onboarding() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile) redirect(homeFor(profile.role));
  return <OnboardingForm defaultName={user.user_metadata?.full_name ?? ""} />;
}
