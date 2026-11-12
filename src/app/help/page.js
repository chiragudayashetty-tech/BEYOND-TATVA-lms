import SocialLinks from "@/components/SocialLinks";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import Shell from "@/components/shell/Shell";
import { Card, PageTitle } from "@/components/ui";

export const metadata = { title: "Help and support · Beyond Tatva" };

const questions = [
  {
    question: "How do I sign in?",
    answer: "You can sign in with Google or with an email link. Use the same login you used when you bought the course. The course opens only with the login you bought with.",
  },
  {
    question: "Is Module 0 free?",
    answer: "Yes. Module 0 is free to try after you sign in.",
  },
  {
    question: "How do I unlock the full course?",
    answer: "Pay on the Beyond Tatva website, or use a school key if your school gave you one. If a parent paid with their phone number, we check the match before access is opened.",
    // Inside the Play Store app we may not say where to pay (src/lib/android-app.js).
    appAnswer: "You can't buy the course in this app. If you already have the course, sign in with the same login you bought it with. If your school gave you a key, enter it on the Unlock page.",
  },
  {
    question: "A video is not playing. What can I try?",
    answer: "Open the course in Chrome, check your internet or mobile data, and try the video again. If it still does not play, message us.",
  },
  {
    question: "When can I see the right quiz answers?",
    answer: "You will see the right answers after you pass the quiz or after your third try. Look back at the lesson and try again.",
  },
  {
    question: "What can I upload for an assignment?",
    answer: "You can attach photos (JPG, PNG, WebP, HEIC or HEIF) or PDF files. Each file can be up to 10 MB, and you can attach up to five files.",
  },
  {
    question: "How do I add the course to my phone?",
    webOnly: true,
    answer: "On Android, open the browser menu and tap “Add to Home screen” or “Install app”. On iPhone, open the page in Safari, tap Share, choose “Add to Home Screen”, then tap Add.",
  },
];

const supportNumber = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
const supportUrl = supportNumber.length >= 8 ? `https://wa.me/${supportNumber}` : null;

export default function HelpPage() {
  return (
    <Shell roles={["student", "teacher", "admin"]}>
      <PageTitle title="Help and support" subtitle="Quick answers for students, families and teachers." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Common questions" className="divide-y divide-border">
          {questions.map(({ question, answer, appAnswer, webOnly }) => <details key={question} className={`group py-1 first:pt-0 last:pb-0 ${webOnly ? "web-only" : ""}`}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              {question}<span aria-hidden="true" className="text-xl text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className={`pb-4 pr-8 text-sm leading-relaxed text-muted ${appAnswer ? "web-only" : ""}`}>{answer}</p>
            {appAnswer && <p className="app-only pb-4 pr-8 text-sm leading-relaxed text-muted">{appAnswer}</p>}
          </details>)}
        </Card>

        <div className="space-y-6">
          <Card title="Talk to us">
            <p className="text-sm leading-relaxed text-muted">If you still need help, ask a parent or guardian to message us.</p>
            {supportUrl ? <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 min-h-11 w-full sm:w-auto">
              <MessageCircle className="h-4 w-4" /> Chat with us on WhatsApp
            </a> : <p className="mt-4 text-sm text-muted">WhatsApp support is coming soon.</p>}
          </Card>

          <Card title="Follow us">
            <p className="mb-3 text-sm text-muted">AI tips, new modules and student projects.</p>
            <SocialLinks />
          </Card>

          <Card title="Your privacy">
            <p className="text-sm leading-relaxed text-muted">We store your name, grade, school and parent or guardian&apos;s WhatsApp number so the course can work and your family can receive important updates. We never sell this information.</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">Want a copy of your data, or want it deleted? Ask a parent or guardian to message us and we will do it for you. <Link href="/delete-account" className="font-medium text-primary">How to delete your account</Link></p>
          </Card>
        </div>
      </div>
      <Link href="/dashboard" className="btn-secondary mt-6 min-h-11"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
    </Shell>
  );
}
