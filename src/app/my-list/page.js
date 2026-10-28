import StudentFrame, { PageHeader } from "@/components/ott/StudentFrame";
import { CourseCard, ContinueCard } from "@/components/ott/Cards";
import { continueWatching, courses } from "@/lib/catalog";

export const metadata = { title: "My List · Beyond Tatva" };

export default function MyList() {
  const saved = courses.filter((c) => ["build-a-chatbot", "ai-in-science", "data-detectives"].includes(c.id));
  const done = courses.filter((c) => c.progress === 100);
  return (
    <StudentFrame>
      <PageHeader title="My List" subtitle="Saved courses, what you're watching and what you've finished" />
      <section className="px-4 pt-6 sm:px-8 lg:px-12">
        <h2 className="mb-4 font-display text-xl font-bold">▶️ In progress</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>a]:w-full">
          {continueWatching.map((c) => <ContinueCard key={c.id} course={c} />)}
        </div>
      </section>
      <section className="px-4 pt-8 sm:px-8 lg:px-12">
        <h2 className="mb-4 font-display text-xl font-bold">🔖 Saved for later</h2>
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>a]:w-full">
          {saved.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>
      <section className="px-4 pt-8 sm:px-8 lg:px-12">
        <h2 className="mb-4 font-display text-xl font-bold">🏆 Finished</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {done.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-3xl bg-yellow p-5">
              <span className="text-4xl">🎓</span>
              <div>
                <div className="font-display font-bold">{c.title}</div>
                <div className="text-sm text-foreground/70">Certificate earned · Download PDF</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </StudentFrame>
  );
}
