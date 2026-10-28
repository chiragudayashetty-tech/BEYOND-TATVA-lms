import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Who's learning? · Beyond Tatva" };

// Demo profile picker. With real accounts, a family/teacher sees only their own profiles.
const profiles = [
  { href: "/browse", name: "Ananya", role: "Student · Grade 9", bg: "bg-sky", face: "🦊" },
  { href: "/browse", name: "Rohan", role: "Student · Grade 8", bg: "bg-mint", face: "🐼" },
  { href: "/parent", name: "Parent", role: "Lakshmi", bg: "bg-yellow", face: "🏡" },
  { href: "/teacher", name: "Teacher", role: "Mrs. D'Souza", bg: "bg-lilac", face: "🍎" },
  { href: "/admin", name: "Admin", role: "Beyond Tatva", bg: "bg-pink", face: "🛠️" },
];

export default function Profiles() {
  return (
    <div className="glow flex min-h-screen flex-col items-center px-4 py-8">
      <Logo />
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <h1 className="text-center font-display text-4xl font-extrabold sm:text-6xl">Who&apos;s learning today?</h1>
        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:grid-cols-5">
          {profiles.map((p, i) => (
            <Link key={p.name} href={p.href} className="group flex flex-col items-center text-center">
              <span
                className={`grid h-28 w-28 place-items-center rounded-[2rem] ${p.bg} text-5xl shadow-[0_6px_0_rgba(15,23,42,0.12)] ring-4 ring-transparent transition duration-300 group-hover:-translate-y-2 group-hover:ring-foreground sm:h-36 sm:w-36 sm:text-6xl`}
                style={{ transform: `rotate(${[-3, 2, -2, 3, -1][i]}deg)` }}
              >
                {p.face}
              </span>
              <span className="mt-4 font-display text-lg font-bold">{p.name}</span>
              <span className="text-sm text-muted">{p.role}</span>
            </Link>
          ))}
        </div>
        <Link href="/onboarding" className="btn-ghost mt-12">+ Add profile</Link>
      </div>
    </div>
  );
}
