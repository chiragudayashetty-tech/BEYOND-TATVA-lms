import Shell from "@/components/shell/Shell";
import { PageTitle } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import QuizEditor from "./QuizEditor";

export const metadata = { title: "Quizzes · Studio · Beyond Tatva" };

export default async function QuizzesPage() {
  const [course, supabase] = await Promise.all([getCourse(), createClient()]);
  const [{ data: quizzes }, { data: attempts }] = await Promise.all([
    supabase.from("quizzes").select("id, chapter_id, title, pass_percent, xp, published"),
    supabase.from("quiz_attempts").select("quiz_id, student_id, passed"),
  ]);
  // Answers are only readable through the Studio function, never the table.
  const questions = Object.fromEntries(await Promise.all((quizzes ?? []).map(async (q) => {
    const { data } = await supabase.rpc("studio_quiz_questions", { p_quiz: q.id });
    return [q.id, data ?? []];
  })));
  const stats = {};
  for (const a of attempts ?? []) {
    const s = (stats[a.quiz_id] ??= { attempts: 0, students: new Set(), passed: new Set() });
    s.attempts += 1;
    s.students.add(a.student_id);
    if (a.passed) s.passed.add(a.student_id);
  }
  const summary = Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, { attempts: v.attempts, students: v.students.size, passed: v.passed.size }]));

  return (
    <Shell roles={["admin"]}>
      <PageTitle title="Quizzes" subtitle="One quiz per module. Students see it once the module is open to them and the quiz is published. Answers never reach the student's device." />
      <QuizEditor modules={course.modules.map((m) => ({ id: m.id, n: m.n, title: m.title }))} quizzes={quizzes ?? []} questions={questions} stats={summary} />
    </Shell>
  );
}
