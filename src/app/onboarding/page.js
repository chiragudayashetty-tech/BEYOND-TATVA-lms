import { loginLabel } from "@/lib/login-id";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";
import OnboardingChat from "./OnboardingChat";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Set up your account · Beyond Tatva" };

export default async function Onboarding({ searchParams }) {
  const { next } = await searchParams;
  const back = safeNext(next, null);
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile) redirect(back ?? homeFor(profile.role));
  return <OnboardingChat defaultName={user.user_metadata?.full_name ?? ""} next={back} signedInAs={loginLabel(user)} loginPhone={user.phone || ""} />;
}
