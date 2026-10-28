import Link from "next/link";
import Logo from "@/components/Logo";

// Demo role picker. Once auth is wired this page will redirect by the user's role.
const views = [
  { href: "/student", icon: "🎒", label: "Student", body: "Netflix-style courses, interactive lessons" },
  { href: "/parent", icon: "👨‍👩‍👧", label: "Parent", body: "Progress and screen time" },
  { href: "/teacher", icon: "🧑‍🏫", label: "Teacher", body: "Class progress and time spent" },
  { href: "/admin", icon: "🛠️", label: "Admin", body: "Upload content, integrations, automations" },
];

export default function Dashboard() {
  return (
    <div className="glow grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <h1 className="text-3xl font-bold">Pick a view to explore</h1>
        <p className="mt-2 text-muted">Demo mode: sample data, no login needed.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {views.map((v) => (
            <Link key={v.href} href={v.href} className="card text-left transition hover:-translate-y-1 hover:border-teal">
              <div className="text-3xl">{v.icon}</div>
              <div className="mt-3 text-lg font-semibold">{v.label}</div>
              <div className="text-sm text-muted">{v.body}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
