import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";

// Sends each person to their own home based on their role.
export default async function Dashboard() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  redirect(profile ? homeFor(profile.role) : "/onboarding");
}
