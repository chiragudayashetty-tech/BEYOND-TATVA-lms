// The teacher terms shown before a teacher code works (sign-up) and to any teacher who hasn't accepted.
export const TEACHER_TERMS = [
  "The course is for teaching your own students at your school only.",
  "Do not share, copy, record, upload, resell or give away the videos, quizzes or materials, or your login.",
  "Do not use Beyond Tatva content for paid tuition, other schools or your own courses.",
  "Breaking these terms ends your access at once, and Beyond Tatva may take legal action under the Copyright Act, 1957 and the IT Act, 2000.",
];

export function TermsList() {
  return (
    <ul className="space-y-2 text-sm">
      {TEACHER_TERMS.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{t}</li>)}
    </ul>
  );
}
