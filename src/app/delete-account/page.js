import Link from "next/link";
import Logo from "@/components/Logo";
import { supportWhatsApp } from "@/lib/social";

export const metadata = { title: "Delete your account · Beyond Tatva" };

const EMAIL = "chiragshetty@beyondtatva.in";

// Public (no sign-in): Google Play asks for a web page where anyone can ask for their account to be deleted.
export default function DeleteAccountPage() {
  const wa = supportWhatsApp("Hi! Please delete my Beyond Tatva account. The login (email or phone) is: ");
  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <section className="card space-y-4 p-6 text-sm leading-relaxed">
          <h1 className="text-xl font-semibold">Delete your Beyond Tatva account</h1>
          <p className="text-muted">You can ask us to delete your Beyond Tatva account and your data at any time. If you are under 18, please ask a parent or guardian to send the request.</p>

          <h2 className="font-semibold">How to ask</h2>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Message us on WhatsApp or send an email, from the phone number or email you use to sign in.</li>
            <li>Tell us the student&apos;s name and the login (email or phone number) of the account.</li>
            <li>We confirm it is really you, then delete the account within 30 days and tell you when it is done.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary">Ask on WhatsApp</a>}
            <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Delete my Beyond Tatva account")}`} className="btn-secondary">Email {EMAIL}</a>
          </div>

          <h2 className="font-semibold">What we delete</h2>
          <p className="text-muted">Your login, your profile (name, grade, school, parent or guardian&apos;s phone number), your course progress, quiz answers, assignments and uploaded files, and your certificates.</p>

          <h2 className="font-semibold">What we keep</h2>
          <p className="text-muted">Payment and invoice records, for as long as Indian tax law asks us to keep them. Nothing else.</p>

          <p className="text-muted">Want only part of your data deleted, or a copy of it? Ask the same way. More details are in our <a href="https://www.beyondtatva.in/privacy" className="font-medium text-primary">privacy policy</a>.</p>
        </section>
        <p className="mt-4 text-center text-sm text-muted"><Link href="/" className="font-medium text-primary">Back to Beyond Tatva</Link></p>
      </div>
    </main>
  );
}
