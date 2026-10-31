import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import { cookies } from "next/headers";
import { cache } from "react";

// Supabase client for Server Components, Route Handlers and Server Actions.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
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
    const picked = (await cookies()).get("preview_role")?.value;
    const role = ["student", "parent", "teacher", "admin"].includes(picked) ? picked : PREVIEW;
    const unlocked = (await cookies()).get("preview_access")?.value === "1";
    return { ...previewSession(role), hasAccess: role !== "student" || unlocked };
  }
  return realSession();
});

export const isPreview = Boolean(PREVIEW);

const previewNames = { student: "Ananya Rao", parent: "Lakshmi Rao", teacher: "Meera D'Souza", admin: "Chirag Shetty" };

function previewSession(role) {
  return {
    user: { id: "preview", email: "preview@example.com" },
    profile: { id: "preview", role, full_name: previewNames[role], grade: role === "student" ? 9 : null, invite_code: "C6C02F", guardian_consent_at: null },
  };
}

const PROFILE_FIELDS = "id, role, full_name, avatar, grade, invite_code, guardian_consent_at, school_id, guardian_phone";

async function realSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const loadProfile = () => supabase.from("profiles").select(PROFILE_FIELDS).eq("id", user.id).maybeSingle();
  let { data: profile } = await loadProfile();

  // First sign-in of an email on the Studio allowlist: becomes admin, skipping student onboarding.
  if (!profile) {
    const { data: madeAdmin } = await supabase.rpc("claim_studio_admin");
    if (madeAdmin) ({ data: profile } = await loadProfile());
  }

  // Teachers and admins can watch everything (has_course_access in the database); parents only follow progress.
  let hasAccess = Boolean(profile && (profile.role === "teacher" || profile.role === "admin"));
  if (profile?.role === "student") {
    const { data } = await supabase.from("course_access").select("course_id").eq("student_id", user.id).maybeSingle();
    hasAccess = Boolean(data);
    // Paid on the website with this account's email or parent phone? Unlock now.
    if (!hasAccess) {
      const { data: claimed } = await supabase.rpc("claim_purchases");
      hasAccess = claimed > 0;
    }
  }
  return { user, profile, hasAccess };
}

// For pages that belong to some roles only. Admins can open everything.
export async function requireRole(roles) {
  const { redirect } = await import("next/navigation");
  const session = await getSession();
  if (!session.user) redirect("/login");
  if (!session.profile) {
    // Come back to the page they asked for (e.g. /unlock or a lesson) once their account is set up.
    const { headers } = await import("next/headers");
    const path = (await headers()).get("x-pathname");
    redirect(path && path.startsWith("/") && !path.startsWith("//") ? `/onboarding?next=${encodeURIComponent(path)}` : "/onboarding");
  }
  if (!roles.includes(session.profile.role) && session.profile.role !== "admin") redirect(homeFor(session.profile.role));
  return session;
}

export const homeFor = (role) => ({ student: "/browse", parent: "/parent", teacher: "/teacher", admin: "/admin" })[role] ?? "/onboarding";
