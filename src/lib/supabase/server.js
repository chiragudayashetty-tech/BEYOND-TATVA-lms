import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Supabase client for Server Components, Route Handlers and Server Actions.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; proxy.js refreshes the session instead.
        }
      },
    },
  });
}

// The signed-in user and their profile (null profile = not onboarded yet). Cached per request.
// Local design preview only: DEV_PREVIEW_ROLE=student|parent|teacher|admin fakes a signed-in user in `next dev`.
const PREVIEW = process.env.NODE_ENV === "development" ? process.env.DEV_PREVIEW_ROLE : undefined;

export const getSession = cache(async () => {
  if (PREVIEW) {
    return {
      user: { id: "preview", email: "ananya@example.com" },
      profile: { id: "preview", role: PREVIEW, full_name: PREVIEW === "student" ? "Ananya Rao" : PREVIEW === "parent" ? "Lakshmi Rao" : PREVIEW === "teacher" ? "Meera D'Souza" : "Chirag Shetty", grade: PREVIEW === "student" ? 9 : null, invite_code: "C6C02F", guardian_consent_at: null },
    };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar, grade, invite_code, guardian_consent_at, school_id")
    .eq("id", user.id)
    .maybeSingle();
  return { user, profile };
});

// For pages that belong to some roles only. Admins can open everything.
export async function requireRole(roles) {
  const { redirect } = await import("next/navigation");
  const session = await getSession();
  if (!session.user) redirect("/login");
  if (!session.profile) redirect("/onboarding");
  if (!roles.includes(session.profile.role) && session.profile.role !== "admin") redirect(homeFor(session.profile.role));
  return session;
}

export const homeFor =(role) => ({ student: "/browse", parent: "/parent", teacher: "/teacher", admin: "/admin" })[role] ?? "/onboarding";
