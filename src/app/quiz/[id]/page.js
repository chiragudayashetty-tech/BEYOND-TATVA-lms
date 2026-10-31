import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { getCourse } from "@/lib/data";
import { createClient, getSession } from "@/lib/supabase/server";
import QuizRunner from "./QuizRunner";

export const metadata = { title: "Quiz · Beyond Tatva" };

export default async function QuizPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ user }, course, { data: quiz }] = await Promise.all([
    getSession(),
    getCourse(),
    supabase.from("quizzes").select("id, chapter_id, title, pass_percent, xp").eq("id", id).maybeSingle(),
  ]);
  if (!quiz) notFound(); // unpublished, locked or not real: RLS returns nothing
  const [{ data: questions }, { data: attempts }] = await Promise.all([
    // Only these columns are readable by students; answers stay on the server.
    supabase.from("quiz_questions").select("id, position, prompt, options").eq("quiz_id", id).order("position").order("id"),
    supabase.from("quiz_attempts").select("score, total, passed").eq("quiz_id", id).eq("student_id", user?.id ?? "").order("score", { ascending: false }).limit(1),
  ]);
  const mod = course.modules.find((m) => m.id === quiz.chapter_id);

  return (
    <Shell roles={["student", "teacher"]}>
      <Link href={mod ? `/course#m${mod.n}` : "/course"} className="btn-ghost -ml-3 mb-3"><ArrowLeft className="h-4 w-4" /> {mod ? `Module ${mod.n}: ${mod.title}` : "Course"}</Link>
      <QuizRunner quiz={quiz} questions={questions ?? []} best={attempts?.[0] ?? null} />
    </Shell>
  );
}
