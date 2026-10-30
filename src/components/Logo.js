import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default function Logo({ href = "/", size = "md" }) {
  const mark = size === "lg" ? "h-10" : "h-8";
  const word = size === "lg" ? "h-4" : "h-3";
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5" aria-label="Beyond Tatva home">
      <img src="/brand/mark-trim.png" alt="" className={`${mark} w-auto`} />
      <img src="/brand/wordmark-black.png" alt="Beyond Tatva" className={`${word} dark:hidden`} />
      <img src="/brand/wordmark-white.png" alt="" aria-hidden="true" className={`${word} hidden dark:block`} />
    </Link>
  );
}
