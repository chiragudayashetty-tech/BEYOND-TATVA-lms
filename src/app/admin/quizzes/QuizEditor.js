"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import FormStatus from "@/components/FormStatus";
import { Badge } from "@/components/ui";
import { deleteQuestion, deleteQuiz, saveQuestion, saveQuiz } from "../actions";

function QuizSettings({ module: m, quiz }) {
  const [state, action, pending] = useActionState(saveQuiz, null);
  const [deleting, startDelete] = useTransition();
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_110px_110px]">
      <input type="hidden" name="chapter" value={m.id} />
      {quiz && <input type="hidden" name="id" value={quiz.id} />}
      <label><span className="label">Quiz title</span><input name="title" className="input" defaultValue={quiz?.title ?? `Module ${m.n} quiz`} required maxLength={120} /></label>
      <label><span className="label">Pass mark %</span><input name="pass" type="number" min={1} max={100} className="input" defaultValue={quiz?.pass_percent ?? 60} required /></label>
      <label><span className="label">XP for passing</span><input name="xp" type="number" min={0} max={1000} className="input" defaultValue={quiz?.xp ?? 100} required /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={quiz?.published ?? false} className="h-4 w-4 accent-[var(--primary)]" /> Published (students can take it)</label>
        <button disabled={pending} className="btn-primary px-3 py-2">{pending ? "Saving…" : quiz ? "Save quiz" : "Create quiz"}</button>
        {quiz && (
          <button type="button" disabled={deleting} onClick={() => confirm("Delete this quiz, its questions and every student's attempts?") && startDelete(() => deleteQuiz(quiz.id))}
            className="btn-ghost px-3 py-2 text-danger"><Trash2 className="h-4 w-4" /> Delete quiz</button>
        )}
        <FormStatus state={state} />
      </div>
    </form>
  );
}

function QuestionForm({ quizId, question, position, onDone }) {
  const [state, action, pending] = useActionState(async (prev, fd) => {
    const r = await saveQuestion(prev, fd);
    if (r.ok && !question) onDone?.();
    return r;
  }, null);
  const [deleting, startDelete] = useTransition();
  const [options, setOptions] = useState(question?.options ?? ["", ""]);
  const [correct, setCorrect] = useState(question?.correct_index ?? null);

  const remove = (i) => {
    setOptions((o) => o.filter((_, j) => j !== i));
    setCorrect((c) => (c === i ? null : c > i ? c - 1 : c));
  };

  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-surface p-3">
      <input type="hidden" name="quiz" value={quizId} />
      {question && <input type="hidden" name="id" value={question.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
        <textarea name="prompt" rows={2} className="input" defaultValue={question?.prompt} placeholder="Question" required maxLength={500} aria-label="Question" />
        <input name="position" type="number" className="input" defaultValue={question?.position ?? position} aria-label="Order" title="Order" />
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium text-muted">Answers: tick the correct one</legend>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" value={i} checked={correct === i} onChange={() => setCorrect(i)} className="h-4 w-4 accent-[var(--success)]" aria-label={`Option ${i + 1} is correct`} required />
            <input name="option" className="input py-2" value={o} onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${String.fromCharCode(65 + i)}`} maxLength={200} />
            {options.length > 2 && <button type="button" onClick={() => remove(i)} className="btn-ghost p-2" aria-label="Remove option"><X className="h-4 w-4" /></button>}
          </div>
        ))}
        {options.length < 6 && <button type="button" onClick={() => setOptions((o) => [...o, ""])} className="btn-ghost px-2 py-1 text-xs"><Plus className="h-3.5 w-3.5" /> Add option</button>}
      </fieldset>
      <input name="explanation" className="input" defaultValue={question?.explanation ?? ""} placeholder="Why this is the answer (shown after they submit)" maxLength={500} />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className="btn-primary px-3 py-2">{pending ? "Saving…" : question ? "Save question" : "Add question"}</button>
        {question && (
          <button type="button" disabled={deleting} onClick={() => confirm("Delete this question?") && startDelete(() => deleteQuestion(question.id))}
            className="btn-ghost px-3 py-2 text-danger"><Trash2 className="h-4 w-4" /> Delete</button>
        )}
        <FormStatus state={state} />
      </div>
    </form>
  );
}

function ModuleQuiz({ module: m, quiz, questions, stats, open, onToggle }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-surface-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-subtle">Module {m.n}</div>
          <div className="font-semibold">{m.title}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
            {quiz ? <>
              <Badge tone={quiz.published ? "success" : "neutral"}>{quiz.published ? "Published" : "Draft"}</Badge>
              <span>{questions.length} questions · pass {quiz.pass_percent}% · {quiz.xp} XP</span>
              {stats && <span>· {stats.passed}/{stats.students} students passed ({stats.attempts} attempts)</span>}
            </> : <span>No quiz yet</span>}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border bg-surface-2 p-4">
          <QuizSettings module={m} quiz={quiz} />
          {quiz && (
            <>
              {quiz.published && questions.length === 0 && <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">Published with no questions: students will see &quot;no questions yet&quot;.</p>}
              {questions.map((q, i) => <QuestionForm key={q.id} quizId={quiz.id} question={q} position={i + 1} />)}
              {adding
                ? <QuestionForm quizId={quiz.id} position={questions.length + 1} onDone={() => setAdding(false)} />
                : <button onClick={() => setAdding(true)} className="btn-secondary"><Plus className="h-4 w-4" /> Add a question</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuizEditor({ modules, quizzes, questions, stats }) {
  const [open, setOpen] = useState(null);
  const byChapter = Object.fromEntries(quizzes.map((q) => [q.chapter_id, q]));
  return (
    <div className="space-y-3">
      {modules.map((m) => {
        const quiz = byChapter[m.id];
        return <ModuleQuiz key={m.id} module={m} quiz={quiz} questions={quiz ? questions[quiz.id] ?? [] : []} stats={quiz ? stats[quiz.id] : null}
          open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} />;
      })}
    </div>
  );
}
