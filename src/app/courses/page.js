import StudentFrame, { PageHeader } from "@/components/ott/StudentFrame";
import { CourseCard } from "@/components/ott/Cards";
import { courses } from "@/lib/catalog";

export const metadata = { title: "Courses · Beyond Tatva" };

const grades = ["Grade 8", "Grade 9", "Grade 10", "All grades"];

export default function CoursesPage() {
  return (
    <StudentFrame>
      <PageHeader title="All courses" subtitle={`${courses.length} courses · new ones every month`} />
      {grades.map((g) => {
        const list = courses.filter((c) => c.grade === g);
        if (!list.length) return null;
        return (
          <section key={g} className="px-4 pt-6 sm:px-8 lg:px-12">
            <h2 className="mb-4 font-display text-xl font-bold">{g}</h2>
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>a]:w-full">
              {list.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          </section>
        );
      })}
    </StudentFrame>
  );
}
