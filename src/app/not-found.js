import Link from "next/link";
import { Compass } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata = { title: "Page not found · Beyond Tatva" };

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary"><Compass className="h-6 w-6" /></span>
          <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
          <p className="mt-2 text-muted">That link may be old or mistyped.</p>
          <Link href="/dashboard" className="btn-primary mt-6 w-full">Go to my home</Link>
        </div>
      </div>
    </div>
  );
}
