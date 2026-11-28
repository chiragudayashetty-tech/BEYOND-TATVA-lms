import Link from "next/link";
import Logo from "@/components/Logo";
import { supportWhatsApp } from "@/lib/social";

// Shared bits for the public legal pages (/privacy, /terms). Plain server components, no sign-in needed.
export const LEGAL = {
  business: "Beyond Tatva",
  owner: "Chirag Shetty (sole proprietor)",
  place: "Udupi, Karnataka, India",
  email: "chiragshetty@beyondtatva.in",
  phoneText: "+91 73376 45448",
  updated: "28 November 2026",
};

export function LegalPage({ title, updated = LEGAL.updated, intro, toc, children, other }) {
  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <article className="card space-y-4 p-6 text-sm leading-relaxed">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-xs text-muted">Last updated: {updated}</p>
            {intro}
          </header>
          {toc && (
            <nav aria-label="Contents" className="rounded-xl border border-border p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Contents</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-muted">
                {toc.map(([id, label]) => <li key={id}><a href={`#${id}`} className="text-primary hover:underline">{label}</a></li>)}
              </ol>
            </nav>
          )}
          {children}
          <ContactBlock />
        </article>
        <p className="mt-4 text-center text-sm text-muted">
          {other} · <Link href="/refund-policy" className="font-medium text-primary">Refund policy</Link> · <Link href="/delete-account" className="font-medium text-primary">Delete account</Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted"><Link href="/" className="font-medium text-primary">Back to Beyond Tatva</Link></p>
      </div>
    </main>
  );
}

export function Section({ id, n, title, children }) {
  return (
    <section id={id} className="scroll-mt-4 space-y-2">
      <h2 className="text-base font-semibold">{n}. {title}</h2>
      {children}
    </section>
  );
}

export const P = ({ children }) => <p className="text-muted">{children}</p>;
export const UL = ({ children }) => <ul className="list-disc space-y-1 pl-5 text-muted">{children}</ul>;

export function Callout({ children }) {
  return <div className="rounded-xl border border-border bg-bg p-3 text-muted">{children}</div>;
}

export function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[34rem] text-left text-xs">
        <thead className="bg-bg text-muted"><tr>{head.map((h) => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r[0]} className="border-t border-border align-top">{r.map((c, i) => <td key={i} className={`p-2 ${i ? "text-muted" : "font-medium"}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function ContactBlock() {
  const wa = supportWhatsApp("Hi! I have a question about the Beyond Tatva privacy policy / terms.");
  return (
    <section id="contact" className="scroll-mt-4 space-y-2 rounded-xl border border-border p-3">
      <h2 className="text-base font-semibold">Contact and grievance officer</h2>
      <p className="text-muted">
        {LEGAL.business}, run by {LEGAL.owner}, {LEGAL.place}. For any question, complaint, privacy request or to reach our
        grievance officer (Chirag Shetty): email <a className="font-medium text-primary" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        {wa ? <> or <a className="font-medium text-primary" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp {LEGAL.phoneText}</a></> : <> or WhatsApp {LEGAL.phoneText}</>}.
        We acknowledge within 2 working days and aim to resolve within 30 days.
      </p>
    </section>
  );
}
