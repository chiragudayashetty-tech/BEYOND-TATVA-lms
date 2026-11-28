import Link from "next/link";
import { LegalPage, Section, P, UL, Callout, Table } from "@/components/Legal";

export const metadata = {
  title: "Privacy policy · Beyond Tatva",
  description: "What data Beyond Tatva collects from students and parents, why, who we share it with, how we protect it, and how to delete it.",
};

const TOC = [
  ["who", "Who we are"], ["children", "Children and parental consent"], ["collect", "What we collect"], ["why", "Why we use it"],
  ["share", "Who we share it with"], ["transfer", "Where data is stored"], ["cookies", "Cookies, analytics and error reports"],
  ["keep", "How long we keep it"], ["security", "How we protect it"], ["rights", "Your rights and how to use them"],
  ["breach", "If something goes wrong"], ["thirdparty", "Third-party AI tools and links"], ["changes", "Changes to this policy"],
];

// Public (no sign-in). Written 2026-11-28 from how the product really works (docs/PROJECT.md). Keep it true:
// when a vendor, data field or retention rule changes in the product, change it here in the same PR.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      toc={TOC}
      other={<Link href="/terms" className="font-medium text-primary">Terms and conditions</Link>}
      intro={
        <>
          <P>Beyond Tatva teaches AI skills to students in Grades 8 to 10. Most of our students are children, so we collect as little as we can, keep it safe, and never sell it. This page explains exactly what we do, in plain words. <strong>Parents and guardians: please read it with your child.</strong></P>
          <Callout><strong>In short:</strong> we keep a child&apos;s name, class, school and a parent&apos;s phone number so the course works. We never sell data, never show ads to students, and never let one student see another student&apos;s information. A parent can ask us to show, correct or delete everything at any time.</Callout>
        </>
      }
    >
      <Section id="who" n={1} title="Who we are">
        <P>Beyond Tatva is a sole proprietorship run by Chirag Shetty in Udupi, Karnataka, India (MSME Udyam UDYAM-KR-26-0066858). Under India&apos;s Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;), Beyond Tatva is the <strong>Data Fiduciary</strong> for the information described here. This policy covers our website (www.beyondtatva.in), our learning app (learn.beyondtatva.in, also available as an Android app), our WhatsApp and email messages, and our school workshops.</P>
      </Section>

      <Section id="children" n={2} title="Children and parental consent">
        <UL>
          <li>Our students are under 18. <strong>A parent or guardian must agree before a student joins.</strong> At sign-up, the parent (or the student on the parent&apos;s behalf, with the parent&apos;s knowledge) confirms consent and gives the parent&apos;s name and WhatsApp number. We save a record of which wording was shown and when.</li>
          <li>We may check consent by sending a code to the parent&apos;s WhatsApp number. A student who says a parent agreed when that is not true is breaking our terms.</li>
          <li>We do not show advertisements to students, do not build advertising profiles of children, and do not sell or rent any child&apos;s data.</li>
          <li>One login belongs to one child. Parents do not need a separate account; we talk to parents on WhatsApp.</li>
          <li>The student leaderboard is <strong>off by default</strong>. If a student switches it on, other students see only a first name and initial and learning points. It can be switched off any time in Profile.</li>
          <li>A parent can withdraw consent at any time (see section 10). Withdrawing means we stop using the data and close the account; it does not affect what we lawfully did before.</li>
        </UL>
      </Section>

      <Section id="collect" n={3} title="What we collect">
        <P>We collect only what the course needs. We do <strong>not</strong> ask for a child&apos;s Aadhaar, date of birth, home address, photo, location, contacts, or any health or religious information.</P>
        <Table
          head={["What", "Examples", "Where it comes from"]}
          rows={[
            ["Student profile", "Name, grade, school, class section (optional), student's own WhatsApp number or email (optional), sign-in method", "Student or parent at sign-up"],
            ["Parent or guardian", "Name, WhatsApp number, the consent record (wording version, time, how it was confirmed)", "Parent or student at sign-up"],
            ["Learning activity", "Lessons watched and how far, quiz answers and scores, assignments and files the student uploads (photos or PDFs), points (XP), certificates, study plans", "Created as the student learns"],
            ["Payments", "Payment status, amount, date, Razorpay payment ID, coupon used, phone or email entered at checkout. We never see or store card, UPI PIN or bank details.", "Razorpay and the payer"],
            ["Enquiries (leads)", "Parent and student name, phone, school, grade, how they found us, notes from our calls and messages", "Website forms, chat, workshops, WhatsApp, schools"],
            ["Messages", "Your WhatsApp and email conversations with us, delivery status, opt-out choices", "You and our messaging tools"],
            ["Technical data", "Random account ID, device and browser type, pages and buttons used, approximate location from IP address, error details, sign-in and security logs", "Your device, automatically"],
            ["Teachers and school staff", "Name, school, sign-in details, acceptance of the teacher terms", "The teacher"],
          ]}
        />
        <P>Please do not upload anything to an assignment other than the work asked for. Do not upload photos of faces, ID documents or other people&apos;s personal information. Assignment files are visible to the student, to Beyond Tatva reviewers and, for school-enrolled students, may be visible to that school&apos;s teacher.</P>
      </Section>

      <Section id="why" n={4} title="Why we use it">
        <UL>
          <li><strong>Run the course:</strong> create the login, open the right modules each week, track progress, mark quizzes, issue certificates.</li>
          <li><strong>Take payments and refunds</strong> and keep the records tax law requires.</li>
          <li><strong>Talk to families:</strong> course access, reminders, weekly updates and the parent digest on WhatsApp and email. Marketing messages only if the parent has not opted out; reply STOP any time.</li>
          <li><strong>Keep the service safe:</strong> stop fake sign-ups, abuse, account sharing and payment fraud.</li>
          <li><strong>Improve the course:</strong> see which lessons are hard or skipped, using the technical data above.</li>
          <li><strong>Work with schools:</strong> if a school enrolled the student, we tell that school about the student&apos;s progress and participation.</li>
          <li><strong>Meet legal duties</strong> and respond to lawful requests from authorities.</li>
        </UL>
        <P>We do not use a child&apos;s data for anything else without the parent&apos;s fresh consent. We do not make automated decisions that affect a child&apos;s rights.</P>
      </Section>

      <Section id="share" n={5} title="Who we share it with">
        <P>We do not sell or rent data. We use the following service providers who process data <em>for us</em>, only to run the course. Each one is bound by its own security and privacy terms.</P>
        <Table
          head={["Provider", "What for", "Data involved"]}
          rows={[
            ["Supabase", "Database, sign-in, file storage (Mumbai, India)", "All account, profile, progress and uploaded-file data"],
            ["Vercel", "Hosting of the website and app (Mumbai)", "Requests and server logs"],
            ["Razorpay", "Card, UPI and net-banking payments", "Payer contact details and payment details (held by Razorpay)"],
            ["Bunny.net", "Video streaming and downloads", "Video requests, device and IP"],
            ["AiSensy and Meta (WhatsApp)", "WhatsApp codes, reminders and updates", "Phone number, first names, message content and delivery status"],
            ["Resend", "Emails such as password reset", "Email address and email content"],
            ["Google", "Google sign-in; Google Sheets for our lead and school follow-up lists; Google Analytics on the website", "Sign-in email and name; lead details; website visit data"],
            ["PostHog (EU) and Sentry (Germany)", "Understanding course use and fixing errors in the app", "Random account ID, pages, clicks, error details. No names, emails or phone numbers. Screen recordings, if used, hide all text and block images and video."],
            ["Microsoft Clarity", "Heatmaps on the marketing website only", "Anonymous visit behaviour on www.beyondtatva.in"],
          ]}
        />
        <P>We may also share data: (a) with a school, for students that school enrolled; (b) with professional advisers (accountant, lawyer) under confidentiality; (c) if law, a court or a government authority requires it; (d) to protect our rights, safety or property or that of others; and (e) if the business is transferred to another owner, who must honour this policy. We will tell parents before a transfer.</P>
        <P><strong>Inside Beyond Tatva</strong>, only the owner and staff who need it for their job can see student data. Students can never see other students&apos; data. Access is limited by role and recorded in the system.</P>
      </Section>

      <Section id="transfer" n={6} title="Where data is stored">
        <P>The main database and uploaded files are in Supabase&apos;s Mumbai region, and the app runs from Vercel&apos;s Mumbai region. Some providers above (for example PostHog in the EU, Sentry in Germany, and Resend, Google, Meta or Bunny, which run global networks) may handle limited data outside India. We transfer data abroad only to providers with real security practices and only as the DPDP Act allows. By using the service you understand this.</P>
      </Section>

      <Section id="cookies" n={7} title="Cookies, analytics and error reports">
        <UL>
          <li><strong>Essential:</strong> a secure sign-in cookie and a few settings (language, theme). The app does not work without them.</li>
          <li><strong>Analytics:</strong> in the app we use PostHog to see page views, button taps and video progress under a random account ID only. On the marketing website we use Google Analytics and Microsoft Clarity to see how families find and use the site.</li>
          <li><strong>Error reports:</strong> Sentry tells us when something breaks, with the technical details, not the student&apos;s name or contact.</li>
          <li>We use none of these for advertising, and we do not use them to follow children around other websites. You can block cookies in your browser or use a privacy mode; the website will still work, but the app needs its sign-in cookie.</li>
        </UL>
      </Section>

      <Section id="keep" n={8} title="How long we keep it">
        <Table
          head={["Data", "How long"]}
          rows={[
            ["Student account, progress, quiz answers, uploads", "While the account is active. If there is no sign-in and no course access for 24 months, we delete or anonymise it. A verified deletion request is completed within 30 days."],
            ["Consent records", "As long as the account exists, then up to 3 years, to prove consent was given."],
            ["Payment and invoice records", "As long as Indian tax and accounting law requires (not deleted on request, but cut off from the student profile)."],
            ["Enquiries (leads) who did not enrol", "Up to 24 months after the last contact, or sooner if you ask. Parents can opt out any time."],
            ["Messages and delivery logs", "Up to 24 months."],
            ["Analytics and error reports", "Kept by PostHog and Sentry for the period set in our plans with them (generally up to 12 months)."],
            ["Encrypted backups", "Nightly encrypted backups are kept for 30 days and then destroyed, so deleted data leaves our backups within about 30 days."],
          ]}
        />
      </Section>

      <Section id="security" n={9} title="How we protect it">
        <P>We use reasonable security practices suited to a children&apos;s learning service, as expected under the DPDP Act and the Information Technology Act, 2000. Specifically:</P>
        <UL>
          <li><strong>Encryption in transit:</strong> every page and API uses HTTPS with HSTS. Passwords are never stored in readable form; they are hashed by our sign-in provider.</li>
          <li><strong>Strict access rules in the database:</strong> every table has row-level security, so a signed-in student can only read their own records. Staff-only actions are checked on the server, not just hidden in the screen.</li>
          <li><strong>Private files:</strong> uploaded assignments sit in private storage with size and type limits, and a student can only upload into their own folder.</li>
          <li><strong>Payments:</strong> handled by Razorpay. Prices are read from our database, every payment is signature-checked, and we never touch card or UPI details.</li>
          <li><strong>Abuse protection:</strong> limits on sign-up, WhatsApp code requests and password resets; browser protections against clickjacking and content sniffing; no readable secrets in our code.</li>
          <li><strong>Privacy by design in monitoring:</strong> analytics and error tools get a random ID, not names, emails or phone numbers; session recordings mask all text.</li>
          <li><strong>Backups and recovery:</strong> nightly encrypted backups with practised restores. Secrets and keys are held in the hosting provider&apos;s vault, not in code.</li>
          <li><strong>Least privilege:</strong> we collect the minimum, staff see only what their job needs, and unused accounts and data are cleaned up as described above.</li>
        </UL>
        <Callout><strong>Be honest about limits:</strong> no system on the internet is 100% secure, and we cannot guarantee that data will never be accessed without permission. What we do guarantee is that we take the steps above and will act quickly and openly if something goes wrong. <strong>You also play a part:</strong> keep your password, the WhatsApp code and the access key private, do not share your login, and use a screen lock on the phone your child uses.</Callout>
      </Section>

      <Section id="rights" n={10} title="Your rights and how to use them">
        <P>Under the DPDP Act, a parent or guardian (for a child) and any adult user can ask us to:</P>
        <UL>
          <li><strong>Know and access</strong> what data we hold and a copy of it.</li>
          <li><strong>Correct or update</strong> wrong or incomplete data.</li>
          <li><strong>Erase</strong> data we no longer need, and <strong>withdraw consent</strong> at any time.</li>
          <li><strong>Complain</strong> to us (grievance redressal) and, if we do not resolve it, to the Data Protection Board of India once it is set up.</li>
          <li><strong>Nominate</strong> another person to exercise these rights if you cannot.</li>
        </UL>
        <P><strong>How:</strong> message us on WhatsApp or email from the phone number or email on the account, with the student&apos;s name. For a child, the request must come from the parent or guardian. We confirm it is really you, then act within 30 days and tell you when done. To delete an account, see <Link href="/delete-account" className="font-medium text-primary">Delete your account</Link>. Reply STOP to any WhatsApp message to stop updates (course-critical messages like login codes and payment receipts may still be sent while you have an account).</P>
        <P>We may not be able to delete data we must keep by law (such as payment records), and we cannot undo a deletion. Deleting an account removes access to the course; a refund is only given under our <Link href="/refund-policy" className="font-medium text-primary">refund policy</Link>.</P>
      </Section>

      <Section id="breach" n={11} title="If something goes wrong">
        <P>If we find that personal data has been accessed or lost without permission, we will contain it, fix the cause, and tell the affected families and the authorities as required by law, with what happened and what to do next. If you notice anything suspicious, such as messages from our number you did not expect, tell us at once.</P>
      </Section>

      <Section id="thirdparty" n={12} title="Third-party AI tools and links">
        <P>The course teaches students to use AI tools made by other companies (for example chatbots and image or video tools). <strong>Those tools are not run by Beyond Tatva.</strong> They have their own privacy policies, age limits and rules, and many require an adult or a minimum age. Anything a student types into or uploads to such a tool goes to that company, not to us, and we cannot see or control it.</P>
        <UL>
          <li>Parents decide whether, when and how their child uses any third-party tool, and should sit with younger students when they first try one.</li>
          <li>We teach students never to enter their full name, phone number, address, school ID, passwords, photos of themselves or friends, or exam papers into any AI tool.</li>
          <li>Where a tool&apos;s rules need a parent&apos;s account, use the parent&apos;s account.</li>
        </UL>
        <P>Our app and messages may link to other websites such as YouTube, Instagram or WhatsApp. We do not control them. Read their policies before sharing anything.</P>
      </Section>

      <Section id="changes" n={13} title="Changes to this policy">
        <P>We may update this policy as the product or the law changes. The date at the top shows the latest version. If a change is important (for example a new way of using a child&apos;s data), we will tell parents on WhatsApp or in the app and ask for consent again if the law requires it. If you keep using the service after an ordinary change, you accept the new version. Our <Link href="/terms" className="font-medium text-primary">terms and conditions</Link> also apply.</P>
      </Section>
    </LegalPage>
  );
}
