import { Check, Lock } from "lucide-react";
import Shell from "@/components/shell/Shell";
import Certificate from "@/components/Certificate";
import { PageTitle, Progress } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { COURSE_ID } from "@/lib/catalog";
import { createClient, getSession, isPreview } from "@/lib/supabase/server";
import CertificateActions from "./CertificateActions";

export const metadata = { title: "Certificate · Beyond Tatva" };

// The certificate unlocks only when the database agrees every lesson of every module is watched
// (issue_my_certificate, 20261115000009). Until then it shows blurred, with what's left.
export default async function CertificatesPage() {
  const [{ user, profile }, course] = await Promise.all([getSession(), getCourse()]);
  let cert = null;
  if (!isPreview && user && profile?.role === "student" && course.progress === 100) {
    const supabase = await createClient();
    const { data: code } = await supabase.rpc("issue_my_certificate", { p_course: COURSE_ID });
    if (code) {
      const { data } = await supabase.from("certificates").select("code, full_name, issued_at").eq("code", code).maybeSingle();
      cert = data;
    }
  }
  const modules = course.modules.map((m) => m.title);
  const left = course.modules.filter((m) => m.progress < 100);

  return (
    <Shell roles={["student"]}>
      <div className="print:hidden">
        <PageTitle title="Certificate" subtitle={cert ? "You did it! Download it or share it with family and your school." : "Watch every lesson of every module to unlock your certificate."} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="card relative p-3 sm:p-4 print:border-0 print:p-0 print:shadow-none">
          <Certificate name={cert?.full_name ?? profile?.full_name ?? "Your name"} courseTitle={course.title} modules={modules}
            code={cert?.code} issuedAt={cert?.issued_at} locked={!cert} />
          {cert ? <CertificateActions code={cert.code} /> : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="rounded-2xl bg-[#1b2140]/85 px-5 py-4 text-white backdrop-blur">
                <Lock className="mx-auto h-6 w-6" />
                <div className="mt-2 font-semibold">Locked</div>
                <div className="text-sm text-white/80">{course.progress}% watched · {left.length} {left.length === 1 ? "module" : "modules"} to go</div>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3 print:hidden">
          <h2 className="font-semibold">{cert ? "All modules watched 🎉" : "Your path to the certificate"}</h2>
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
          {!cert && course.progress === 100 && (
            <p className="text-sm text-muted">Every open lesson is done. Your certificate unlocks when the last modules are released and watched.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
