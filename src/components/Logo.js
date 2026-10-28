import Link from "next/link";

export default function Logo({ href = "/" }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark.svg" alt="" className="h-9 w-9" />
      <span className="font-display text-lg font-semibold tracking-tight">
        Beyond <span className="text-teal">Tattva</span>
      </span>
    </Link>
  );
}
