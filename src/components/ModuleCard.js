import Link from "next/link";

export default function ModuleCard({ m, wide = false }) {
  return (
    <Link
      href="/student/lesson"
      className={`group relative shrink-0 overflow-hidden rounded-2xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 ${
        wide ? "w-72 sm:w-80" : "w-56 sm:w-64"
      }`}
    >
      <div
        className="relative flex aspect-video items-end p-4"
        style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}33 70%, #0f172a)` }}
      >
        <span className="absolute right-4 top-3 text-4xl transition group-hover:scale-110">{m.emoji}</span>
        <span className="chip bg-black/40 text-white backdrop-blur">{m.level}</span>
        <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#0f172a] shadow-lg">▶</span>
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold">{m.title}</h3>
        <p className="mt-0.5 text-sm text-muted">{m.tagline}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${m.progress}%`, background: m.color }} />
          </div>
          <span>{m.progress === 100 ? "Done ✓" : `${m.lessons} lessons`}</span>
        </div>
      </div>
    </Link>
  );
}
