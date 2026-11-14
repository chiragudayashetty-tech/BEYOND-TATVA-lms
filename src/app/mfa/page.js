import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import MfaForm from "./MfaForm";

export const metadata = { title: "Two-step login" };

// Studio admins confirm each login with a 6-digit code from an authenticator app (Google Authenticator, Authy…).
export default async function MfaPage({ searchParams }) {
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect(homeFor(profile?.role));
  const next = safeNext((await searchParams)?.next, "/admin");
  if (user.aal === "aal2") redirect(next);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <MfaForm next={next} />
    </main>
  );
}
