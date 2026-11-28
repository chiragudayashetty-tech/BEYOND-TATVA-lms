"use client";

// EN | ಕನ್ನಡ switch used on the sign-in page and in the tour.
export default function LangToggle({ lang, onChange, className = "" }) {
  const btn = (value, label) => (
    <button type="button" onClick={() => onChange(value)} aria-pressed={lang === value}
      className={`min-h-9 rounded-full px-3 text-sm font-semibold transition ${lang === value ? "bg-primary text-primary-fg" : "text-muted hover:text-fg"}`}>
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Language" className={`inline-flex rounded-full border border-border bg-surface p-0.5 ${className}`}>
      {btn("en", "English")}{btn("kn", "ಕನ್ನಡ")}
    </div>
  );
}
