import Link from "next/link";
import { LegalPage, Section, P, UL, Callout } from "@/components/Legal";

export const metadata = {
  title: "Terms and conditions · Beyond Tatva",
  description: "The rules for using the Beyond Tatva AI course: what we provide, what parents and students are responsible for, payments, content, safety and limits of our liability.",
};

const TOC = [
  ["accept", "Who these terms are with"], ["service", "What we provide"], ["role", "Our role: we teach, you decide and supervise"],
  ["parents", "Parent and guardian responsibilities"], ["conduct", "Rules for students"], ["ai", "AI tools and AI output"],
  ["accounts", "Accounts and access"], ["content", "Our content and your content"], ["pay", "Fees, payments and refunds"],
  ["community", "WhatsApp and community"], ["schools", "Schools, workshops and teachers"], ["suspend", "Suspension and ending access"],
  ["disclaimer", "Disclaimers"], ["liability", "Limit of our liability"], ["indemnity", "Indemnity"], ["law", "Law, disputes and general terms"],
];

// Public (no sign-in). Written 2026-11-28. Plain English on purpose (readers include parents); the protective
// clauses are in sections 3, 13, 14 and 15. Have a lawyer read this once before heavy marketing (see PR notes).
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and conditions"
      toc={TOC}
      other={<Link href="/privacy" className="font-medium text-primary">Privacy policy</Link>}
      intro={
        <>
          <P>These terms are the agreement between Beyond Tatva and the parent or guardian (and through them, the student) for the Beyond Tatva AI course, website, app, WhatsApp messages and workshops. <strong>Please read them with your child. By ticking the consent box at sign-up, paying, or using the service, you accept them.</strong></P>
          <Callout><strong>The simple version:</strong> Beyond Tatva teaches AI through recorded lessons, quizzes and projects. We are a teaching service. Parents and guardians stay responsible for their child, their devices and the AI tools they use, and for what the child does with what they learn. We are not responsible for what a student does, inside or outside the course, as set out below.</Callout>
        </>
      }
    >
      <Section id="accept" n={1} title="Who these terms are with">
        <UL>
          <li>&quot;<strong>We</strong>&quot; is Beyond Tatva, run by Chirag Shetty (sole proprietor), Udupi, Karnataka. &quot;<strong>You</strong>&quot; means the parent or guardian who accepts these terms. &quot;<strong>Student</strong>&quot; means the child (Grades 8 to 10) using the course. A teacher or school staff member using a teacher code is also bound by the <em>teacher terms</em> shown at sign-up.</li>
          <li>A person under 18 cannot make a binding contract in India. So <strong>the parent or guardian is the contracting party</strong> and is responsible for the student&apos;s use. If the student ticks the box, they confirm that their parent or guardian knows and agrees.</li>
          <li>If you do not agree, please do not use the service. Module 0 is free so you can look before you decide.</li>
        </UL>
      </Section>

      <Section id="service" n={2} title="What we provide">
        <UL>
          <li>Recorded video lessons organised in weekly modules, with quizzes, assignments, study material, points (XP), certificates, and WhatsApp and email updates, as described on our website and app at the time you pay.</li>
          <li>Access is for <strong>one student</strong>, for as long as we offer the course and for at least 2 years from payment, unless ended under these terms.</li>
          <li>Modules open on set dates (usually Sundays 10:00 AM IST). We may reschedule, rename, shorten, add or improve lessons, quizzes and features, and move how things are delivered, without charging extra. Items marked &quot;coming soon&quot; are plans, not promises of a date.</li>
          <li>The service is provided on a reasonable-efforts basis. It can have downtime, bugs, slow video on poor networks, or maintenance. Your device, internet and WhatsApp must work for you to use it.</li>
        </UL>
      </Section>

      <Section id="role" n={3} title="Our role: we teach, you decide and supervise">
        <Callout><strong>Important.</strong> Our duty is limited to showing the course modules and teaching students about AI. We are an education provider, not a guardian, supervisor, counsellor, babysitter or security service for your child.</Callout>
        <UL>
          <li><strong>We do not supervise students</strong> when they watch lessons, use phones, computers or the internet, use AI or other apps, or chat with others. Students may use the course anywhere and at any time, usually at home. Supervision is the parent&apos;s or guardian&apos;s job. In a school workshop, supervision of students is the school&apos;s job (see section 11).</li>
          <li><strong>We are not responsible for what any student does</strong>, whether during a lesson, after it, or entirely outside the course, including how they use AI tools, the internet, social media, WhatsApp, or anything they learn from us. We teach skills and good habits; we cannot control behaviour or decisions.</li>
          <li>We do not guarantee marks, ranks, admissions, scholarships, jobs, income, competitions, or any particular result or skill level. How much a student learns depends on their effort, ability, attendance and home support.</li>
          <li>Nothing we teach is professional advice (legal, medical, mental health, financial or career). Do not rely on the course for those.</li>
          <li>We are not a replacement for school. Students must follow their school&apos;s rules, including its rules about AI in homework, projects and exams.</li>
        </UL>
      </Section>

      <Section id="parents" n={4} title="Parent and guardian responsibilities">
        <P>As the parent or guardian you agree to:</P>
        <UL>
          <li>give true and current information, and keep your WhatsApp number and email working;</li>
          <li>supervise your child&apos;s use of the course, their devices and any AI tools or websites, and decide what is suitable for your child&apos;s age and maturity;</li>
          <li>use parental controls, safe-search and privacy settings you think right, and create any account a third-party tool requires for a minor in your own name;</li>
          <li>keep the login, WhatsApp codes, passwords and access keys private and not share the course, videos or materials;</li>
          <li>talk to your child about safe, honest and respectful use of AI, and about not sharing personal information, photos or passwords online;</li>
          <li>tell us immediately if you think an account was misused or you see content that worries you.</li>
        </UL>
        <P>You are responsible for everything done through your child&apos;s account, whether or not you knew of it, and for any harm or loss caused by your child to themselves or others.</P>
      </Section>

      <Section id="conduct" n={5} title="Rules for students">
        <P>Students must:</P>
        <UL>
          <li>be respectful and honest, in lessons, WhatsApp groups, assignments and any message to us;</li>
          <li>use their own login and do their own work; use AI to <em>help learn</em>, not to cheat in tests or submit AI work as their own where a teacher or school forbids it;</li>
          <li>keep personal information private, and not put anyone&apos;s personal data, photos, voice or private messages into an AI tool or upload them to us.</li>
        </UL>
        <P>Students must <strong>not</strong>:</P>
        <UL>
          <li>use AI or anything taught here to create, share or ask for content that is sexual, violent, hateful, harassing or bullying, or that copies, imitates or harms another person (for example fake photos, voices, videos or messages, &quot;deepfakes&quot;, or impersonation). Such acts can be serious offences under Indian law, including the Information Technology Act, 2000, the Bharatiya Nyaya Sanhita and the POCSO Act, and the person who does it and their guardian are fully responsible;</li>
          <li>try to trick or &quot;jailbreak&quot; AI tools into harmful output, hack, scrape or overload our service, or try to see other students&apos; data;</li>
          <li>share, copy, record, upload, resell or give away lessons, quizzes, files, answers or their login or access key;</li>
          <li>use our name, logo or certificates to mislead anyone, or share false certificates.</li>
        </UL>
        <P>We may remove content, warn, suspend or close an account for breaking these rules (section 12). Where required by law, or to protect a child or others, we may report matters to the school, parents or the authorities.</P>
      </Section>

      <Section id="ai" n={6} title="AI tools and AI output">
        <UL>
          <li>AI tools can be wrong, biased, out of date, or make things up. <strong>Always check important facts</strong> from reliable sources and with a teacher or parent. Our lessons, examples and tool demos are for learning and may become outdated because AI changes quickly.</li>
          <li>Third-party AI tools, apps and websites shown in the course are <strong>independent companies</strong>. They set their own prices, age limits, privacy practices and rules, and can change, charge or shut down at any time. We do not run, control, endorse, guarantee or take responsibility for them, their outputs, or any loss from using them. Any cost of those tools is yours.</li>
          <li>You and your child are responsible for following each tool&apos;s terms and age rules and for how they use it. Where a tool requires a parent, use the parent&apos;s account.</li>
          <li>You are responsible for the content that you or the student create or share using AI, including checking it does not break copyright, privacy or anyone&apos;s rights.</li>
        </UL>
      </Section>

      <Section id="accounts" n={7} title="Accounts and access">
        <UL>
          <li>One login per child. Sign in with the student&apos;s own phone, email or Google account, or the number we ask for in sign-up. Do not let others use it. Account sharing is a reason to close the account without refund.</li>
          <li>Access keys, coupons and school codes are single-use or limited as stated, cannot be sold, and may be cancelled if misused.</li>
          <li>Keep your devices secure. We may ask you to verify yourself before we change or delete an account.</li>
        </UL>
      </Section>

      <Section id="content" n={8} title="Our content and your content">
        <UL>
          <li>All videos, slides, quizzes, notes, scripts, designs, names, logos and certificates belong to Beyond Tatva or our licensors and are protected by the Copyright Act, 1957. You get a personal, non-transferable, non-commercial licence to watch and use them for the enrolled student only.</li>
          <li>You may not copy, record, download except through our offline feature, share, resell, teach paid classes from, or build other courses or AI training sets from our content.</li>
          <li>What a student submits (answers, assignments, uploads) remains theirs. They give us permission to store, review, mark and display it to the people who need to see it for the course (see our <Link href="/privacy" className="font-medium text-primary">privacy policy</Link>). With parent permission, we may share a student&apos;s work (without full name or contact details) as an example, and you can ask us to remove it.</li>
          <li>If you believe content here breaks your rights, tell us (section 16) with details and we will review it promptly.</li>
        </UL>
      </Section>

      <Section id="pay" n={9} title="Fees, payments and refunds">
        <UL>
          <li>The price is what the app or website shows when you pay, in Indian rupees, inclusive of taxes unless stated. Coupons and offers follow their own conditions and may end at any time.</li>
          <li>Pay only through the official payment page at learn.beyondtatva.in or the access-key/WhatsApp method we confirm. We never ask for card numbers, UPI PIN or OTPs on WhatsApp or by phone. Payments are processed by Razorpay and are subject to its terms. We are not responsible for failures of banks, UPI apps or payment providers, but will help you sort out a double charge.</li>
          <li>Refunds follow our <Link href="/refund-policy" className="font-medium text-primary">refund policy</Link>. Outside it, fees are non-refundable, including when access is closed for breaking these terms.</li>
          <li>Future price changes do not affect what you have already paid for.</li>
        </UL>
      </Section>

      <Section id="community" n={10} title="WhatsApp and community">
        <UL>
          <li>We message the parent&apos;s WhatsApp number (and the student&apos;s if given) with codes, receipts, reminders and updates. Reply STOP to opt out of non-essential messages.</li>
          <li>Community groups are for course questions. Members must be respectful and not share personal information, links to unsafe content, or advertising. We may mute or remove anyone. Messages posted by members are their own and we are not responsible for them, nor for private chats outside our control.</li>
          <li>WhatsApp, Meta and your phone provider have their own terms, and WhatsApp has its own minimum age. Parents decide whether their child uses WhatsApp.</li>
        </UL>
      </Section>

      <Section id="schools" n={11} title="Schools, workshops and teachers">
        <UL>
          <li>For workshops or classes at a school, <strong>the school remains fully responsible for the supervision, safety, discipline and welfare of students</strong>, for the premises, devices and internet, and for getting any consent it needs from parents. Our trainers teach the session; they are not in charge of supervising or looking after students.</li>
          <li>If a school enrols students, the school confirms it has the authority to do so and shares with us only data it is allowed to share. We may share a student&apos;s progress with that school.</li>
          <li>Teachers who get a teacher code must follow the teacher terms accepted at sign-up and must not share or misuse content or student information.</li>
        </UL>
      </Section>

      <Section id="suspend" n={12} title="Suspension and ending access">
        <P>We may warn, restrict, suspend or close an account, with or without notice, if these terms or our rules are broken, if payment is reversed, if we suspect fraud or a risk to others, or if the law requires. You can stop using the service or ask us to delete the account any time (<Link href="/delete-account" className="font-medium text-primary">how</Link>). Sections that by nature should continue (content, disclaimers, liability, indemnity, law) survive.</P>
        <P>If we discontinue the whole course, we will give reasonable notice and, for paid students who have not had reasonable use of it, a fair refund of the unused part.</P>
      </Section>

      <Section id="disclaimer" n={13} title="Disclaimers">
        <P>To the fullest extent the law allows:</P>
        <UL>
          <li>The service, content and any third-party tools are provided <strong>&quot;as is&quot; and &quot;as available&quot;</strong>, without promises that they will be uninterrupted, error-free, secure, always up to date, or suitable for your particular purpose.</li>
          <li>We are <strong>not responsible</strong> for: (a) any act, omission, decision or behaviour of a student or parent, online or offline, including misuse of AI or the internet; (b) content, advice, outputs, safety or availability of third-party tools, websites, apps or other users; (c) loss or damage from your device, internet, power, phone number change, software or someone else gaining access to a login you did not keep safe; (d) things that happen in school workshops that are the school&apos;s responsibility; (e) results, marks or outcomes; (f) events beyond our control such as outages of Supabase, Vercel, Bunny, WhatsApp, Razorpay or Google, internet failures, natural events, government orders or disputes.</li>
          <li>We take privacy and security seriously (see our <Link href="/privacy" className="font-medium text-primary">privacy policy</Link>), but cannot promise that no unauthorised access will ever occur.</li>
        </UL>
      </Section>

      <Section id="liability" n={14} title="Limit of our liability">
        <UL>
          <li>To the fullest extent the law allows, our total liability to you and the student for all claims connected with the service is limited to <strong>the fees you actually paid for the course in the 12 months before the claim</strong> (or ₹1,000 if the student only used free content).</li>
          <li>We are not liable for indirect, special, incidental or consequential loss, or for loss of profit, income, opportunity, data, reputation or goodwill, or emotional distress, even if we were told it could happen.</li>
          <li><strong>What these terms do not limit:</strong> liability that Indian law does not allow to be excluded or limited, such as for our fraud or wilful misconduct, or for death or personal injury caused by our negligence, and the rights you have as a consumer under the Consumer Protection Act, 2019. If any part of these terms is found unenforceable, the rest stays in force and that part is read down to the extent the law allows.</li>
        </UL>
      </Section>

      <Section id="indemnity" n={15} title="Indemnity">
        <P>You agree to protect Beyond Tatva, its owner and staff from claims, losses, costs and legal fees that arise because the student or parent broke these terms or the law, misused the service, content or any AI tool, or harmed or infringed the rights of another person or school. This applies to the extent the loss was caused by that act and not by our own wrongdoing.</P>
      </Section>

      <Section id="law" n={16} title="Law, disputes and general terms">
        <UL>
          <li><strong>Talk to us first.</strong> Write to us at <a className="font-medium text-primary" href="mailto:chiragshetty@beyondtatva.in">chiragshetty@beyondtatva.in</a> or on WhatsApp. We will reply within 2 working days and try to settle it within 30 days.</li>
          <li>These terms are governed by the laws of India. If a dispute is not settled, courts at <strong>Udupi, Karnataka</strong> have jurisdiction, without affecting any right you have to approach a consumer commission or court where the law gives you that right.</li>
          <li>We may update these terms. The date at the top shows the latest version. If a change matters, we will tell you on WhatsApp or in the app. If you continue to use the service after that, you accept the update; if you do not agree, you can stop and ask for deletion.</li>
          <li>We may transfer these terms with the business. You may not transfer your rights. If we do not enforce a term at once, that does not mean we give it up. These terms, the <Link href="/privacy" className="font-medium text-primary">privacy policy</Link> and the <Link href="/refund-policy" className="font-medium text-primary">refund policy</Link> together are the whole agreement.</li>
          <li>We communicate in English and Kannada for convenience; the English version prevails if they differ.</li>
        </UL>
      </Section>
    </LegalPage>
  );
}
