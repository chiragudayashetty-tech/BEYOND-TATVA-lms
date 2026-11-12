"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { resetQuizTries } from "../../actions";

// Gives one student both tries back on this quiz (their old tries and the XP from them are removed).
export default function ResetTries({ quizId, studentId, name }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button type="button" disabled={pending} className="btn-secondary"
        onClick={() => confirm(`Give ${name} both tries back? Their current tries and the XP from this quiz will be removed.`)
          && start(async () => { const r = await resetQuizTries(quizId, studentId); setError(r.ok ? "" : r.error); })}>
        <RotateCcw className="h-4 w-4" /> {pending ? "Resetting…" : "Give tries back"}
      </button>
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
    </>
  );
}
