import { notFound } from "next/navigation";
import Player from "@/components/ott/Player";
import { courses, getCourse } from "@/lib/catalog";

export function generateStaticParams() {
  return courses.map((c) => ({ id: c.id }));
}

export const metadata = { title: "Watching · Beyond Tatva" };

export default async function WatchPage({ params, searchParams }) {
  const { id } = await params;
  const { l } = await searchParams;
  const course = getCourse(id);
  if (!course) notFound();
  return <Player key={l ?? "current"} course={course} lessonN={l ? Number(l) : undefined} />;
}
