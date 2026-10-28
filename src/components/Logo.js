import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default function Logo({ href = "/", size = "md", light = false }) {
  const h = size === "lg" ? "h-10" : "h-8";
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5" aria-label="Beyond Tatva home">
      <img src="/brand/mark-trim.png" alt="" className={`${h} w-auto`} />
      <img
        src={light ? "/brand/wordmark-white.png" : "/brand/wordmark-black.png"}
        alt="Beyond Tatva"
        className={size === "lg" ? "h-4" : "h-3"}
      />
    </Link>
  );
}
