import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySignature } from "@/lib/enrollments";

// Website → LMS: called by beyondtatva.in after a payment succeeds (or is refunded).
//
// POST /api/enrollments
//   x-bt-timestamp: unix seconds          x-bt-signature: hex HMAC-SHA256(ENROLLMENT_WEBHOOK_SECRET, `${timestamp}.${rawBody}`)
//   { "event": "enrollment.paid", "reference": "pay_123", "email": "kid@gmail.com", "phone": "9845012345",
//     "student_name": "...", "parent_name": "...", "amount_paise": 99900 }
//   { "event": "enrollment.refunded", "reference": "pay_123" }
// Safe to retry: the payment reference makes each enrollment count once.

const str = (v, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request) {
  const raw = await request.text();
  const ok = verifySignature(raw, request.headers.get("x-bt-timestamp"), request.headers.get("x-bt-signature"), process.env.ENROLLMENT_WEBHOOK_SECRET);
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const reference = str(body.reference, 100);
  if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

  const db = createAdminClient();
  let result;
  if (body.event === "enrollment.paid") {
    if (!str(body.email) && !str(body.phone)) return NextResponse.json({ error: "email or phone is required" }, { status: 400 });
    result = await db.rpc("record_purchase", {
      p_reference: reference,
      p_email: str(body.email),
      p_phone: str(body.phone, 20),
      p_student_name: str(body.student_name, 80),
      p_parent_name: str(body.parent_name, 80),
      p_amount_paise: Number.isInteger(body.amount_paise) ? body.amount_paise : null,
    });
  } else if (body.event === "enrollment.refunded") {
    result = await db.rpc("revoke_purchase", { p_reference: reference });
  } else {
    return NextResponse.json({ error: "unknown event" }, { status: 400 });
  }

  if (result.error) {
    const bad = /required|valid|Unknown course/i.test(result.error.message);
    console.error("enrollment failed", body.event, reference, result.error.message);
    return NextResponse.json({ error: bad ? result.error.message : "temporary failure" }, { status: bad ? 400 : 500 });
  }
  // claimed = unlocked on an existing account; pending = unlocks when they first sign in.
  return NextResponse.json({ ok: true, status: result.data });
}
