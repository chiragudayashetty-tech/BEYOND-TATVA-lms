"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Lets a signed-in parent link a child with the code from the child's Profile page.
export default function LinkChild() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("link_child", { p_code: code });
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
      <input className="input font-mono uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="A1B2C3" maxLength={6} required />
      <button disabled={busy} className="btn-primary"><Link2 className="h-4 w-4" /> {busy ? "Linking…" : "Link child"}</button>
      {error && <p role="alert" className="w-full text-sm text-danger sm:basis-full">{error}</p>}
    </form>
  );
}
