import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

const PUBLIC = ["/", "/login"];

// Refreshes the Supabase session cookie and sends logged-out visitors to /login.
// Also passes the requested path to Server Components (x-pathname) so onboarding can send people back.
export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const withPath = () => {
    const headers = new Headers(request.headers);
    headers.set("x-pathname", pathname + search);
    return NextResponse.next({ request: { headers } });
  };
  if (process.env.NODE_ENV === "development" && process.env.DEV_PREVIEW_ROLE) return withPath();

  let refreshed = [];
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        refreshed = cookiesToSet;
      },
    },
  });

  // Verifies the session token locally (and refreshes it when expired) instead of a network round trip.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;
  // API routes answer for themselves (401 JSON, or Razorpay's webhook which has no session).
  const isPublic = PUBLIC.includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/");

  let response;
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    response = NextResponse.redirect(url);
  } else if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next?.startsWith("/") && !next.startsWith("//") ? next.split("?")[0] : "/dashboard";
    url.search = next?.includes("?") ? next.slice(next.indexOf("?")) : "";
    response = NextResponse.redirect(url);
  } else {
    response = withPath();
  }
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = {
  // Skip static files and media so videos and images never wait on auth.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|media/|.*\\.(?:svg|png|jpg|jpeg|webp|mp4)$).*)"],
};
