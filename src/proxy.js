import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

const PUBLIC = ["/", "/login"];

// Refreshes the Supabase session cookie and sends logged-out visitors to /login.
export async function proxy(request) {
  let response = NextResponse.next({ request });
  if (process.env.NODE_ENV === "development" && process.env.DEV_PREVIEW_ROLE) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.includes(pathname) || pathname.startsWith("/auth/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip static files and media so videos and images never wait on auth.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|media/|.*\\.(?:svg|png|jpg|jpeg|webp|mp4)$).*)"],
};
