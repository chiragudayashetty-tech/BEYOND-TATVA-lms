import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Set up your account · Beyond Tatva" };

export default async function Onboarding({ searchParams }) {
  const { next } = await searchParams;
  const back = safeNext(next, null);
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile) redirect(back ?? homeFor(profile.role));
  return <OnboardingForm defaultName={user.user_metadata?.full_name ?? ""} next={back} signedInAs={user.email || user.phone || ""} loginPhone={user.phone || ""} />;
}
