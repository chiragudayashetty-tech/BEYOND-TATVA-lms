import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { settleUnverifiedPassword } from "@/lib/password-accounts";

// Called by the login page right after an email code is verified (Google and email links settle in
// auth/callback). Replaces a password set before the inbox was proven: see lib/password-accounts.
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const reset = await settleUnverifiedPassword(supabase);
  return NextResponse.json({ reset });
}
