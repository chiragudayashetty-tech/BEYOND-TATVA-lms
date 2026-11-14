import Link from "next/link";
import Logo from "@/components/Logo";
import { supportWhatsApp } from "@/lib/social";

export const metadata = { title: "Refund policy · Beyond Tatva" };

// Public (no sign-in): linked under the Pay button on /unlock and from the website footer.
// Rules approved by Chirag 2026-11-14: 7 days, at most 1 paid lesson watched, requests on WhatsApp.
export default function RefundPolicyPage() {
  const wa = supportWhatsApp("Hi! I'd like a refund for Beyond Tatva. Student name: , login (email or phone): , payment reference (pay_...): ");
  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <section className="card space-y-4 p-6 text-sm leading-relaxed">
          <h1 className="text-xl font-semibold">Refund policy</h1>
          <p className="text-muted">Module 0 is free, so you can try the course before you pay. If you pay and then feel it isn&apos;t right for your child, you can get your money back.</p>

          <h2 className="font-semibold">You get a full refund if</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>you ask within <strong>7 days</strong> of paying, <strong>and</strong></li>
            <li>the student has watched <strong>no more than 1 paid lesson</strong>.</li>
          </ul>
          <p className="text-muted">If something went wrong on our side (you were charged twice, or the course didn&apos;t work on your device and we couldn&apos;t fix it), we refund in full, whatever the date.</p>

          <h2 className="font-semibold">We can&apos;t refund</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>requests made more than 7 days after payment</li>
            <li>accounts where more than 1 paid lesson has been watched</li>
            <li>accounts closed for breaking the course rules (for example, sharing a login or videos)</li>
          </ul>

          <h2 className="font-semibold">How to ask</h2>
          <p className="text-muted">Message us on WhatsApp with the student&apos;s name, the email or phone used to sign in, and the payment reference from your Razorpay receipt (it starts with <code>pay_</code>). We reply within 2 working days.</p>
          {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary">Ask for a refund on WhatsApp</a>
            : <p className="text-muted">WhatsApp support is coming soon.</p>}

          <h2 className="font-semibold">What happens next</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>The money goes back to the same UPI, card or net banking account within <strong>5–7 working days</strong> after we approve it. Your bank may take a few extra days to show it.</li>
            <li>Course access ends when the refund is made. Module 0 stays free.</li>
          </ul>

          <h2 className="font-semibold">Paid by a school or with an access key</h2>
          <p className="text-muted">If your school paid, or you used an access key, please ask whoever paid. Refunds go back to them.</p>
        </section>
        <p className="mt-4 text-center text-sm text-muted"><Link href="/" className="font-medium text-primary">Back to Beyond Tatva</Link></p>
      </div>
    </main>
  );
}
