import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJson } from "@/lib/body";
import { isStaffDomain } from "@/lib/login-id";
import { indianMobile } from "@/lib/login-id";
import { PROOF_COOKIE, PROOF_SECONDS, WORK_TABLES, firstName, phoneVariants, readProof, signProof } from "@/lib/phone-account";

// One WhatsApp number → every account it belongs to (login phone, student's number or parent's number).
// Chirag 2026-11-20: a student's and a parent's number both open the account; several accounts → "Which
// student?"; an extra account can be deleted only when it's empty (no work, no payments).
// Only for the number this browser proved with a WhatsApp code in the last 30 minutes (signed cookie).
//   POST verify {phone, token} → checks the WhatsApp code (signs in) and sets the proof cookie
//   GET              → { accounts: [{ id, name, current, empty, canOpen }] }
//   POST open {id}   → { token_hash } — the browser signs in with verifyOtp({ token_hash, type: "magiclink" })
//   POST delete {id} → { ok } — empty accounts only, never the one you're signed in to
export const dynamic = "force-dynamic";
const say = (status, error) => NextResponse.json({ error }, { status });

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

async function linkedAccounts(admin, me, phone) {
  const variants = phoneVariants(phone);
  const [a, b, staff] = await Promise.all([
    admin.from("profiles").select("id, full_name, role").in("student_phone", variants).limit(10),
    admin.from("profiles").select("id, full_name, role").in("guardian_phone", variants).limit(10),
    admin.from("studio_admins").select("entry"),
  ]);
  const rows = new Map([...(a.data ?? []), ...(b.data ?? [])].map((r) => [r.id, r]));
  if (!rows.has(me.id) && String(me.phone ?? "").endsWith(phone.slice(-10))) {
    const { data } = await admin.from("profiles").select("id, full_name, role").eq("id", me.id).maybeSingle();
    rows.set(me.id, data ?? { id: me.id, full_name: null, role: null });
  }
  const staffSet = new Set((staff.data ?? []).map((s) => s.entry));
  const isTeam = (r, email) => (r.role && r.role !== "student") || isStaffDomain(email) || staffSet.has(email) || staffSet.has(`@${email.split("@")[1]}`);
  const out = [];
  for (const r of rows.values()) {
    const { data } = await admin.auth.admin.getUserById(r.id);
    const u = data?.user;
    if (!u) continue;
    const email = u.email ?? "";
    if (r.id !== me.id && isTeam(r, email)) continue; // team accounts never appear here
    const counts = await Promise.all(WORK_TABLES.map((t) => admin.from(t).select("student_id", { count: "exact", head: true }).eq("student_id", r.id)));
    const paid = await admin.from("purchases").select("id", { count: "exact", head: true }).eq("claimed_by", r.id);
    // A failed count is treated as "has work", so nothing is ever deleted on a hiccup.
    const empty = counts.every((c) => !c.error && !c.count) && !paid.error && !paid.count;
    out.push({ id: r.id, name: firstName(r.full_name), current: r.id === me.id, empty, canOpen: r.id === me.id || Boolean(email), email });
  }
  return out.sort((x, y) => Number(y.current) - Number(x.current));
}

async function context() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const me = data?.user;
  if (!me) return { fail: say(401, "Please sign in again.") };
  const phone = readProof((await cookies()).get(PROOF_COOKIE)?.value, secret());
  if (!phone) return { fail: say(403, "Sign in with a WhatsApp code again to switch accounts.") };
  return { me, phone, admin: createAdminClient() };
}

export async function GET() {
  const { fail, me, phone, admin } = await context();
  if (fail) return fail;
  const accounts = await linkedAccounts(admin, me, phone);
  return NextResponse.json({ accounts: accounts.map((a) => ({ id: a.id, name: a.name, current: a.current, empty: a.empty, canOpen: a.canOpen })) });
}

export async function POST(request) {
  const { tooBig, body } = await readJson(request, 500);
  if (tooBig) return say(413, "Too much data.");
  if (body?.action === "verify") return verifyCode(body);
  const { fail, me, phone, admin } = await context();
  if (fail) return fail;
  const list = await linkedAccounts(admin, me, phone);
  const target = list.find((a) => a.id === body?.id);
  if (!target) return say(404, "That account isn't linked to this number.");

  if (body?.action === "delete") {
    if (target.current) return say(400, "Open another account first, then delete this one.");
    if (!target.empty) return say(400, "This account has lessons, work or a payment, so it can't be deleted here. Message us on WhatsApp.");
    const { error } = await admin.auth.admin.deleteUser(target.id);
    if (error) {
      console.error("empty account delete failed", error.message);
      return say(500, "Couldn't delete it. Try again.");
    }
    console.info("empty duplicate account deleted from login");
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "open") {
    if (target.current) return NextResponse.json({ current: true });
    if (!target.email) return say(400, "This account has no email yet, so it opens only with its own number. Message us on WhatsApp for help.");
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: target.email });
    if (error || !data?.properties?.hashed_token) {
      console.error("account switch failed", error?.message);
      return say(500, "Couldn't open that account. Try again.");
    }
    // The account being left: if WhatsApp just made it and it's empty (no profile, no work, no email), remove
    // it so this number doesn't keep landing on an empty account.
    const here = list.find((a) => a.current);
    const { data: prof } = await admin.from("profiles").select("id").eq("id", me.id).maybeSingle();
    if (here?.empty && !prof && !me.email) {
      const { error: delError } = await admin.auth.admin.deleteUser(me.id);
      if (delError) console.error("leftover account delete failed", delError.message);
    }
    return NextResponse.json({ token_hash: data.properties.hashed_token });
  }
  return say(400, "Unknown action.");
}

// The WhatsApp code is checked here (not in the browser) so the server knows which number was proved.
async function verifyCode(body) {
  const phone = indianMobile(body?.phone);
  const token = String(body?.token ?? "").replace(/\D/g, "");
  if (!phone || token.length < 4) return say(400, "That code didn't work. Check it, or send a new one.");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone: `+${phone}`, token, type: "sms" });
  if (error) return say(400, error.message);
  (await cookies()).set(PROOF_COOKIE, signProof(phone, secret()), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/api/auth/phone-accounts", maxAge: PROOF_SECONDS,
  });
  return NextResponse.json({ ok: true });
}
