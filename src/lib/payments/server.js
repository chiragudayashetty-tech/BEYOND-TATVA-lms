import "server-only";
import { NextResponse } from "next/server";
import { COURSE_ID } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseCoupon, quote } from "./pricing";

export const fail = (status, error) => NextResponse.json({ error }, { status });

// The signed-in student who is paying. Login always happens before payment, so the order carries this id.
export async function payingStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: fail(401, "Sign in first, then pay.") };
  const { data: profile } = await supabase.from("profiles").select("id, role, full_name, guardian_phone").eq("id", user.id).maybeSingle();
  if (!profile) return { error: fail(403, "Finish setting up your account first.") };
  if (profile.role !== "student") return { error: fail(403, "Payments are made from the student's own account. Sign in with the student's login.") };
  const { data: access } = await supabase.from("course_access").select("source").eq("student_id", user.id).eq("course_id", COURSE_ID).maybeSingle();
  return { user, profile, hasAccess: Boolean(access) };
}

// Server-side price for this course with an optional coupon. The browser never sets the amount.
export async function priceFor(couponInput) {
  const admin = createAdminClient();
  const code = normaliseCoupon(couponInput);
  const [{ data: course, error }, { data: coupon }] = await Promise.all([
    admin.from("courses").select("id, title, price_inr").eq("id", COURSE_ID).single(),
    code ? admin.from("coupons").select("code, percent_off, active, expires_at").eq("code", code).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (error || !course) throw new Error("Course not found");
  const q = quote(course.price_inr, coupon);
  return { admin, course, code, couponInvalid: Boolean(code) && !q.coupon, ...q };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
