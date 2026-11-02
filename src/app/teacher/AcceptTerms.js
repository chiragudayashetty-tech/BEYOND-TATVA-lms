"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { TermsList } from "@/components/TeacherTerms";
import { createClient } from "@/lib/supabase/client";

export default function AcceptTerms() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    setBusy(true);
    const { error } = await createClient().rpc("accept_teacher_terms");
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }
  return (
    <div className="card mx-auto max-w-lg p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Teacher terms</h2>
      <p className="mt-1 text-sm text-muted">Please accept these before using the course.</p>
      <div className="mt-4"><TermsList /></div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <button onClick={accept} disabled={busy} className="btn-primary mt-5 w-full">{busy ? "Saving…" : "I agree"}</button>
    </div>
  );
}
