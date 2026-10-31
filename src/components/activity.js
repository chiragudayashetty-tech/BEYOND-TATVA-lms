import { Badge } from "@/components/ui";

// Status chip for an assignment from the student's side.
export function submissionBadge(sub, a) {
  if (!sub) return a.due_at && new Date(a.due_at) < new Date() ? <Badge tone="danger">Overdue</Badge> : <Badge tone="primary">To do</Badge>;
  if (sub.status === "graded") return <Badge tone="success">{sub.marks}/{a.max_marks}</Badge>;
  if (sub.status === "returned") return <Badge tone="warning">Redo</Badge>;
  return <Badge>Handed in</Badge>;
}

// Status chip for a module quiz: best result so far.
export function quizBadge(best) {
  if (!best) return <Badge tone="primary">Not taken</Badge>;
  return best.passed ? <Badge tone="success">Passed · {best.score}/{best.total}</Badge> : <Badge tone="warning">Best {best.score}/{best.total}</Badge>;
}
