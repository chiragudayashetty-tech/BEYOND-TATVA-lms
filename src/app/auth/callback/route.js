import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { settleUnverifiedPassword } from "@/lib/password-accounts";

// Finishes Google sign-in (?code=) and email magic links (?token_hash=&type=).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // ?next= from the login page, or the bt_next cookie it set (in case Supabase dropped the query).
  const remembered = request.cookies.get("bt_next")?.value;
  const next = searchParams.get("next") || (remembered ? decodeURIComponent(remembered) : null);
  const supabase = await createClient();

  let error = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  else error = { message: "missing code" };

  if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  // Inbox just proven: a password someone set on this email before that is replaced (lib/password-accounts).
  await settleUnverifiedPassword(supabase);
  // Paid on the website before signing in? Unlock now (no-op for non-students and new accounts).
  await supabase.rpc("claim_purchases");
  const dest = safeNext(next);
  const res = NextResponse.redirect(`${origin}${dest}`);
  res.cookies.delete("bt_next");
  return res;
}
