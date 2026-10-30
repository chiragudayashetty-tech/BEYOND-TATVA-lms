import { Check, Download, Lock, Share2 } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { PageTitle, Progress } from "@/components/ui";
import { course } from "@/lib/catalog";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Certificates · Beyond Tatva" };

/* eslint-disable @next/next/no-img-element */
function Certificate({ name, course }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#e7e2d3] bg-[#fdfcf7] p-6 text-center text-[#0f172a] sm:p-10">
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-[#d9cfae]" />
      <img src="/brand/mark-trim.png" alt="" className="mx-auto h-10 w-auto" />
      <img src="/brand/wordmark-black.png" alt="Beyond Tatva" className="mx-auto mt-2 h-3" />
      <div className="mt-6 font-display text-xl font-semibold sm:text-2xl">Certificate of Completion</div>
      <div className="mt-4 text-xs uppercase tracking-[0.2em] text-[#64748b]">This certifies that</div>
      <div className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{name}</div>
      <div className="mt-3 text-sm text-[#64748b]">has successfully completed</div>
      <div className="mt-1 text-lg font-semibold text-[#4f46e5]">{course.title}</div>
      <div className="mt-8 flex items-end justify-between text-left text-xs text-[#64748b]">
        <div>
          <div className="font-display text-base italic text-[#0f172a]">Chirag Shetty</div>
          <div className="mt-1 border-t border-[#cbd5e1] pt-1">Founder, Beyond Tatva</div>
        </div>
        <div className="text-right">
          <div>Issued 18 Oct 2026</div>
          <div className="mt-1">ID BT-2026-0418</div>
        </div>
      </div>
    </div>
  );
}

export default async function CertificatesPage() {
  const { profile } = await getSession();
  const earned = course.progress === 100;
  return (
    <Shell roles={["student"]}>
      <PageTitle title="Certificate" subtitle="Finish all 6 modules and their quizzes to earn a certificate your school can verify." />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-4 sm:p-5">
          <div className={earned ? "" : "pointer-events-none select-none opacity-50 blur-[1px]"}>
            <Certificate name={profile?.full_name ?? "Student"} course={course} />
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={!earned} className="btn-primary flex-1"><Download className="h-4 w-4" /> Download PDF</button>
            <button disabled={!earned} className="btn-secondary flex-1"><Share2 className="h-4 w-4" /> Share</button>
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold">{earned ? "Earned" : `${course.progress}% of the way there`}</h2>
          {course.modules.map((m) => (
            <div key={m.id} className="card flex items-center gap-4 p-4">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${m.progress === 100 ? "bg-success-soft text-success" : "bg-surface-2 text-subtle"}`}>
                {m.progress === 100 ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Module {m.n}: {m.title}</div>
                <Progress value={m.progress} className="mt-2 h-1.5" />
              </div>
              <span className="text-sm font-semibold">{m.progress}%</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}