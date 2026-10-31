"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import Logo from "@/components/Logo";

// Shown when a page fails to load. Keeps the student one tap away from retrying or going home.
export default function Error({ error, unstable_retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-danger-soft text-danger"><TriangleAlert className="h-6 w-6" /></span>
          <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted">This page didn&apos;t load. It&apos;s usually a weak connection; try again.</p>
          {error?.digest && <p className="mt-2 font-mono text-xs text-subtle">Error code {error.digest}</p>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => unstable_retry()} className="btn-primary flex-1"><RotateCw className="h-4 w-4" /> Try again</button>
            <Link href="/dashboard" className="btn-secondary flex-1">Go to my home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
