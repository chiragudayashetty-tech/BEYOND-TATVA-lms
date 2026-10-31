"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck, CircleX, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Badge, Progress } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function QuizRunner({ quiz, questions, best }) {
  const router = useRouter();
  const [answers, setAnswers] = useState(() => questions.map(() => null));
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  if (!questions.length) {
    return <div className="card p-8 text-center"><h1 className="text-xl font-semibold">{quiz.title}</h1><p className="mt-2 text-muted">Questions are coming soon.</p></div>;
  }

  const answered = answers.filter((a) => a !== null).length;
  const q = questions[i];

  async function submit() {
    setBusy(true);
    setError("");
    const { data, error } = await createClient().rpc("submit_quiz", { p_quiz: quiz.id, p_answers: answers });
    setBusy(false);
    if (error) return setError(error.message);
    setResult(data);
    router.refresh(); // XP and module status
  }

  function retry() {
    setAnswers(questions.map(() => null));
    setI(0);
    setResult(null);
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className={`card p-6 text-center ${result.passed ? "border-success/40" : ""}`}>
          <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${result.passed ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
            {result.passed ? <Trophy className="h-7 w-7" /> : <RotateCcw className="h-7 w-7" />}
          </span>
          <h1 className="mt-3 text-2xl font-semibold">{result.passed ? "You passed!" : "Not yet. Try again!"}</h1>
          <p className="mt-1 text-muted">{result.score} of {result.total} correct ({pct}%). Pass mark is {result.pass_percent}%.</p>
          {result.passed && result.xp > 0 && <div className="mt-3"><Badge tone="warning"><Sparkles className="h-3 w-3" /> +{result.xp} XP</Badge></div>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={retry} className="btn-secondary"><RotateCcw className="h-4 w-4" /> Try again</button>
            <a href="/course" className="btn-primary">Back to the course</a>
          </div>
        </div>
        <ol className="space-y-3">
          {questions.map((qq, k) => {
            const r = result.results[k];
            return (
              <li key={qq.id} className="card p-4">
                <div className="flex gap-2">
                  {r.correct ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                  <p className="font-medium">{k + 1}. {qq.prompt}</p>
                </div>
                <ul className="mt-3 space-y-1.5 pl-7 text-sm">
                  {qq.options.map((o, j) => (
                    <li key={j} className={`rounded-lg px-3 py-1.5 ${j === r.correct_index ? "bg-success-soft font-medium text-success" : j === r.picked ? "bg-danger-soft text-danger line-through" : "text-muted"}`}>{o}</li>
                  ))}
                </ul>
                {r.explanation && <p className="mt-2 pl-7 text-sm text-muted">{r.explanation}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{quiz.title}</h1>
          <p className="text-sm text-muted">{questions.length} questions · pass with {quiz.pass_percent}% · {quiz.xp} XP</p>
        </div>
        {best && <Badge tone={best.passed ? "success" : "neutral"}>Best: {best.score}/{best.total}{best.passed ? " · passed" : ""}</Badge>}
      </div>
      <Progress value={(answered / questions.length) * 100} className="h-1.5" />

      <div className="card mt-4 p-5 sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Question {i + 1} of {questions.length}</div>
        <p className="mt-2 text-lg font-semibold">{q.prompt}</p>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label={q.prompt}>
          {q.options.map((o, j) => {
            const on = answers[i] === j;
            return (
              <button key={j} role="radio" aria-checked={on} onClick={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition ${on ? "border-primary bg-primary-soft ring-4 ring-primary/10" : "border-border hover:bg-surface-2"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${on ? "bg-primary text-primary-fg" : "bg-surface-2"}`}>{String.fromCharCode(65 + j)}</span>
                {o}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={() => setI(i - 1)} disabled={i === 0} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</button>
          {i < questions.length - 1
            ? <button onClick={() => setI(i + 1)} disabled={answers[i] === null} className="btn-primary">Next <ArrowRight className="h-4 w-4" /></button>
            : <button onClick={submit} disabled={busy || answered < questions.length} className="btn-primary">{busy ? "Marking…" : "Submit answers"}</button>}
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
