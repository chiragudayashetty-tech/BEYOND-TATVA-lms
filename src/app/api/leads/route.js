import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySignature } from "@/lib/enrollments";

// Website → LMS: a lead from the Loki chat or a website form (server-to-server only).
//
// POST /api/leads   same signing as /api/enrollments (ENROLLMENT_WEBHOOK_SECRET):
//   x-bt-timestamp: unix seconds   x-bt-signature: hex HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
//   { "reference": "loki-<uuid>", "phone": "9845012345", "source": "loki",
//     "parent_name": "...", "student_name": "...", "grade": 9, "school_name": "...",
//     "details": { "board": "CBSE", "goal": "...", "lang": "kn", "utm_source": "qr" } }
// Safe to retry: the reference makes each lead count once.

const str = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function cleanDetails(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  const out = {};
  for (const [k, v] of Object.entries(d).slice(0, 15)) {
    if (/^[a-z_]{1,30}$/.test(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) out[k] = typeof v === "string" ? v.slice(0, 200) : v;
  }
  return out;
}

export async function POST(request) {
  const raw = await request.text();
  if (raw.length > 10_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const ok = verifySignature(raw, request.headers.get("x-bt-timestamp"), request.headers.get("x-bt-signature"), process.env.ENROLLMENT_WEBHOOK_SECRET);
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const reference = str(body.reference, 100);
  if (!reference || !str(body.phone, 20) || !str(body.source, 40)) {
    return NextResponse.json({ error: "reference, phone and source are required" }, { status: 400 });
  }

  const { data, error } = await createAdminClient().rpc("record_lead", {
    p_reference: reference,
    p_phone: str(body.phone, 20),
    p_source: str(body.source, 40),
    p_parent_name: str(body.parent_name, 80),
    p_student_name: str(body.student_name, 80),
    p_grade: Number.isInteger(body.grade) && body.grade >= 1 && body.grade <= 12 ? body.grade : null,
    p_school_name: str(body.school_name, 120),
    p_details: cleanDetails(body.details),
  });
  if (error) {
    const bad = /required|valid|Unknown course/i.test(error.message);
    console.error("lead failed", reference, error.message);
    return NextResponse.json({ error: bad ? error.message : "temporary failure" }, { status: bad ? 400 : 500 });
  }
  return NextResponse.json({ ok: true, status: data }); // saved | duplicate
}
