import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Badge, Card, Empty, PageTitle, Progress, StatCard } from "@/components/ui";
import { QUIZ_TRIES, XP_RULES } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import ResetTries from "./ResetTries";

export const metadata = { title: "Quiz results · Studio · Beyond Tatva" };

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const when = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Studio: how one quiz went. Every student's tries (what they picked, question by question), which
// questions the class finds hard, and a button to give a student their tries back.
export default async function QuizResultsPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: quiz }, { data: questionRows }, { data: attemptRows }] = await Promise.all([
    supabase.from("quizzes").select("id, title, pass_percent, published").eq("id", id).maybeSingle(),
    supabase.rpc("studio_quiz_questions", { p_quiz: id }),
    supabase.from("quiz_attempts").select("id, student_id, answers, score, total, passed, created_at").eq("quiz_id", id).order("created_at"),
  ]);
  if (!quiz) notFound();
  const questions = questionRows ?? [];
  const attempts = attemptRows ?? [];
  const ids = [...new Set(attempts.map((a) => a.student_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, grade").in("id", ids) : { data: [] };
  const person = Object.fromEntries((people ?? []).map((p) => [p.id, p]));

  const students = ids.map((sid) => {
    const tries = attempts.filter((a) => a.student_id === sid);
    const avg = tries.reduce((n, t) => n + t.score, 0) / tries.length;
    return { id: sid, name: person[sid]?.full_name ?? "Deleted student", grade: person[sid]?.grade, tries, avg, xp: Math.round(avg * XP_RULES.quizAnswer), passed: tries.some((t) => t.passed) };
  }).sort((a, b) => b.avg - a.avg || a.name.localeCompare(b.name));

  // Per question: how often it was answered right, and the wrong option picked most.
  const perQuestion = questions.map((q, i) => {
    const picks = attempts.map((a) => a.answers?.[i]).filter((v) => v != null);
    const right = picks.filter((v) => v === q.correct_index).length;
    const wrong = {};
    for (const v of picks) if (v !== q.correct_index) wrong[v] = (wrong[v] ?? 0) + 1;
    const top = Object.entries(wrong).sort((a, b) => b[1] - a[1])[0];
    return { ...q, answered: picks.length, right, trap: top ? { text: q.options[Number(top[0])], n: top[1] } : null };
  });
  const allScores = attempts.map((a) => pct(a.score, a.total));

  return (
    <Shell roles={["admin"]}>
      <Link href="/admin/quizzes" className="btn-ghost -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> Quizzes</Link>
      <PageTitle title={quiz.title} subtitle={`Results. Students get ${QUIZ_TRIES} tries; XP is ${XP_RULES.quizAnswer} for each right answer, on the average of their tries. Pass mark ${quiz.pass_percent}%.`} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Students who tried" value={students.length} hint={`${attempts.length} tries in total`} />
        <StatCard label="Average score" value={allScores.length ? `${Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)}%` : "–"} hint="Across every try" />
        <StatCard label="Passed" value={`${students.filter((s) => s.passed).length}/${students.length}`} hint="On either try" />
        <StatCard label="Used both tries" value={students.filter((s) => s.tries.length >= QUIZ_TRIES).length} hint="Cannot try again" />
      </div>

      {attempts.length === 0 ? <div className="mt-6"><Empty title="Nobody has taken this quiz yet" body="Results show here as soon as the first student submits." /></div> : <>
        <Card title="Question by question" className="mt-6">
          <ol className="space-y-4">
            {perQuestion.map((q, i) => (
              <li key={q.id}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <p className="font-medium">{i + 1}. {q.prompt}</p>
                  <span className="shrink-0 font-semibold">{pct(q.right, q.answered)}% right</span>
                </div>
                <Progress value={pct(q.right, q.answered)} tone={pct(q.right, q.answered) >= 60 ? "success" : "primary"} className="mt-2 h-1.5" />
                <p className="mt-1.5 text-xs text-muted">
                  Answer: {q.options[q.correct_index]}
                  {q.trap && <> · Most common mistake: “{q.trap.text}” ({q.trap.n})</>}
                </p>
              </li>
            ))}
          </ol>
        </Card>

        <Card title={`Students (${students.length})`} className="mt-6" pad={false}>
          <ul className="divide-y divide-border">
            {students.map((s) => (
              <li key={s.id}>
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1 basis-40">
                      <span className="block truncate font-semibold">{s.name}</span>
                      <span className="text-xs text-muted">{s.grade ? `Grade ${s.grade} · ` : ""}{s.tries.map((t, k) => `Try ${k + 1}: ${t.score}/${t.total}`).join(" · ")}</span>
                    </span>
                    <span className="text-sm text-muted">Average {Math.round(s.avg * 10) / 10}/{s.tries[0].total}</span>
                    <Badge tone="warning">{s.xp} XP</Badge>
                    <Badge tone={s.passed ? "success" : "neutral"}>{s.passed ? "Passed" : "Not passed"}</Badge>
                    <span className="text-xs font-medium text-primary group-open:hidden">See answers</span>
                    <span className="hidden text-xs font-medium text-primary group-open:inline">Hide</span>
                  </summary>
                  <div className="space-y-4 border-t border-border bg-surface-2 px-5 py-4">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="text-xs text-muted"><tr><th className="py-2 pr-3">Question</th>{s.tries.map((t, k) => <th key={t.id} className="py-2 pr-3">Try {k + 1} · {when(t.created_at)}</th>)}<th className="py-2">Right answer</th></tr></thead>
                        <tbody className="divide-y divide-border">
                          {questions.map((q, i) => (
                            <tr key={q.id}>
                              <td className="py-2.5 pr-3 align-top">{i + 1}. {q.prompt}</td>
                              {s.tries.map((t) => {
                                const pick = t.answers?.[i];
                                const ok = pick === q.correct_index;
                                return <td key={t.id} className={`py-2.5 pr-3 align-top ${ok ? "text-success" : "text-danger"}`}>
                                  <span className="inline-flex items-start gap-1">{ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}{q.options[pick] ?? "No answer"}</span>
                                </td>;
                              })}
                              <td className="py-2.5 align-top text-muted">{q.options[q.correct_index]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <ResetTries quizId={quiz.id} studentId={s.id} name={s.name} />
                      <Link href={`/admin/analytics/students/${s.id}`} className="btn-secondary">Open scorecard</Link>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
        <p className="mt-3 text-xs text-muted">If you change a quiz&apos;s questions after students have taken it, older tries may not line up with the new questions.</p>
      </>}
    </Shell>
  );
}
