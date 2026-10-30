import { notFound } from "next/navigation";
import Shell from "@/components/shell/Shell";
import { getCourse } from "@/lib/catalog";
import LessonView from "./LessonView";

export const metadata = { title: "Lesson · Beyond Tatva" };

export default async function WatchPage({ params, searchParams }) {
  const { id } = await params;
  const { l } = await searchParams;
  const course = getCourse(id);
  if (!course) notFound();
  const lesson = course.lessons.find((x) => x.n === Number(l)) ?? course.lessons.find((x) => x.current) ?? course.lessons[0];
  return (
    <Shell roles={["student", "teacher"]}>
      <LessonView key={lesson.id} course={course} lesson={lesson} />
    </Shell>
  );
}
