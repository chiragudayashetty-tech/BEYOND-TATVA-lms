import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Finishes Google sign-in (?code=) and email magic links (?token_hash=&type=).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");
  const supabase = await createClient();

  let error = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  else error = { message: "missing code" };

  if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  const dest = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${dest}`);
}
