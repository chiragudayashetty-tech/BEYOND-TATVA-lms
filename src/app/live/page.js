import StudentFrame, { PageHeader } from "@/components/ott/StudentFrame";
import Art from "@/components/ott/Art";
import { getCourse, liveSessions } from "@/lib/catalog";

export const metadata = { title: "Live · Beyond Tatva" };

export default function LivePage() {
  return (
    <StudentFrame>
      <PageHeader title="Live classes" subtitle="Join live, ask questions, and catch the replay if you miss it" />
      <div className="grid gap-4 px-4 pt-6 sm:px-8 md:grid-cols-2 lg:grid-cols-3 lg:px-12">
        {liveSessions.map((s, i) => (
          <div key={s.title} className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_4px_0_#e2e8f0]">
            <div className="relative aspect-video">
              <Art course={getCourse(s.courseId)} seed={`live${i}`} />
              {i === 0 && <span className="absolute left-3 top-3 rounded-full bg-coral px-3 py-1 text-xs font-extrabold uppercase text-white">● Live today</span>}
            </div>
            <div className="p-5">
              <div className="font-display text-lg font-bold">{s.title}</div>
              <div className="mt-1 text-sm text-muted">{s.when} · with {s.host}</div>
              <button className={`${i === 0 ? "btn-yellow" : "btn-ghost"} mt-4 w-full`}>{i === 0 ? "Join at 5:00 PM" : "🔔 Remind me"}</button>
            </div>
          </div>
        ))}
      </div>
    </StudentFrame>
  );
}
