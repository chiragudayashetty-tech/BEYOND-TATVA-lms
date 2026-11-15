import Link from "next/link";
import { BadgeCheck, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Verify a certificate · Beyond Tatva" };

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

// Public: a school or parent checks a certificate ID. Shows first name + last initial only (students are minors).
export default async function VerifyPage({ params }) {
  const { code } = await params;
  const clean = String(code ?? "").toUpperCase().slice(0, 20);
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: clean });
  const cert = data?.[0];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="card p-6 text-center">
        {cert ? (
          <>
            <BadgeCheck className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-3 text-xl font-semibold">Certificate is real</h1>
            <p className="mt-2 text-muted"><b className="text-fg">{cert.name}</b> completed <b className="text-fg">{cert.course_title}</b> on {fmt(cert.issued_at)}.</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" />
            <h1 className="mt-3 text-xl font-semibold">No certificate found</h1>
            <p className="mt-2 text-muted">Check the ID on the certificate. It looks like BT-1A2B-3C4D.</p>
          </>
        )}
        <p className="mt-4 font-mono text-sm text-subtle">{clean}</p>
        <Link href="/" className="btn-secondary mt-6 inline-flex">About Beyond Tatva</Link>
      </div>
    </main>
  );
}
