"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import LangToggle from "@/components/LangToggle";
import { readLang, saveLang } from "@/lib/lang";

// First-time tour of the dashboard, in English or ಕನ್ನಡ (the language picked on the sign-in page or website).
// Shown once per device; "Skip" or the X ends it too. Each step can point at an element with data-tour="<id>".
const DONE_KEY = "bt_tour_done";

const STEPS = [
  { target: null,
    en: ["Welcome to Beyond Tatva! 👋", "A quick 30-second tour of your learning space."],
    kn: ["Beyond Tatvaಗೆ ಸ್ವಾಗತ! 👋", "ನಿಮ್ಮ ಕಲಿಕೆಯ ಜಾಗದ 30 ಸೆಕೆಂಡ್‌ಗಳ ಪರಿಚಯ."] },
  { target: "next",
    en: ["Your next step", "Tap this button to open the next lesson. It always shows what to do next."],
    kn: ["ನಿಮ್ಮ ಮುಂದಿನ ಹೆಜ್ಜೆ", "ಮುಂದಿನ ಪಾಠ ತೆರೆಯಲು ಈ ಬಟನ್ ಒತ್ತಿ. ಮುಂದೆ ಏನು ಮಾಡಬೇಕು ಎಂದು ಇದು ಯಾವಾಗಲೂ ತೋರಿಸುತ್ತದೆ."] },
  { target: "stats",
    en: ["Earn XP", "Watch videos, answer quick checks and take quizzes to earn XP and climb the leaderboard."],
    kn: ["XP ಗಳಿಸಿ", "ವಿಡಿಯೋ ನೋಡಿ, ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ, ಕ್ವಿಜ್ ಮಾಡಿ. XP ಗಳಿಸಿ ಲೀಡರ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ಮೇಲೇರಿ."] },
  { target: "unlock",
    en: ["Module 0 is free", "Start with Module 0 now. Unlock the other modules with a school key or a one-time payment."],
    kn: ["ಮಾಡ್ಯೂಲ್ 0 ಉಚಿತ", "ಈಗಲೇ ಮಾಡ್ಯೂಲ್ 0 ಆರಂಭಿಸಿ. ಉಳಿದ ಮಾಡ್ಯೂಲ್‌ಗಳನ್ನು ಶಾಲೆಯ ಕೀ ಅಥವಾ ಒಂದು ಬಾರಿಯ ಪಾವತಿಯಿಂದ ಅನ್‌ಲಾಕ್ ಮಾಡಿ."] },
  { target: "journey",
    en: ["A new module every Sunday", "New modules premiere every Sunday at 10 AM. All your modules are here."],
    kn: ["ಪ್ರತಿ ಭಾನುವಾರ ಹೊಸ ಮಾಡ್ಯೂಲ್", "ಪ್ರತಿ ಭಾನುವಾರ ಬೆಳಿಗ್ಗೆ 10ಕ್ಕೆ ಹೊಸ ಮಾಡ್ಯೂಲ್ ಬರುತ್ತದೆ. ನಿಮ್ಮ ಎಲ್ಲಾ ಮಾಡ್ಯೂಲ್‌ಗಳು ಇಲ್ಲಿವೆ."] },
  { target: null,
    en: ["You're ready! 🚀", "Use the menu to find Course, Study Kit, Progress and Profile. Have fun learning!"],
    kn: ["ನೀವು ಸಿದ್ಧ! 🚀", "ಕೋರ್ಸ್, ಸ್ಟಡಿ ಕಿಟ್, ಪ್ರಗತಿ ಮತ್ತು ಪ್ರೊಫೈಲ್ ಮೆನುವಿನಲ್ಲಿವೆ. ಖುಷಿಯಿಂದ ಕಲಿಯಿರಿ!"] },
];

const UI = {
  en: { skip: "Skip", next: "Next", back: "Back", done: "Let's start", of: "of" },
  kn: { skip: "ಬಿಡಿ", next: "ಮುಂದೆ", back: "ಹಿಂದೆ", done: "ಆರಂಭಿಸೋಣ", of: "/" },
};

const RING = ["ring-4", "ring-warning", "ring-offset-2", "ring-offset-bg", "rounded-2xl"];

export default function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const [i, setI] = useState(0);
  const [steps, setSteps] = useState(STEPS);

  useEffect(() => {
    let seen = true;
    try { seen = Boolean(localStorage.getItem(DONE_KEY)); } catch {}
    if (seen) return;
    const t = window.setTimeout(() => {
      // Steps whose element isn't on this page (e.g. "unlock" for a student who has paid) are skipped.
      setSteps(STEPS.filter((s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)));
      setLang(readLang());
      setOpen(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, []);

  const step = steps[i];
  useEffect(() => {
    if (!open || !step?.target) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add(...RING);
    return () => el.classList.remove(...RING);
  }, [open, step]);

  function close() {
    try { localStorage.setItem(DONE_KEY, "1"); } catch {}
    setOpen(false);
  }
  function changeLang(l) { setLang(l); saveLang(l); }

  if (!open || !step) return null;
  const [title, body] = step[lang];
  const t = UI[lang];
  const last = i === steps.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 pb-24 sm:items-center lg:pb-4" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="pointer-events-auto card w-full max-w-sm p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <LangToggle lang={lang} onChange={changeLang} />
          <button type="button" onClick={close} aria-label="Close tour" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="tour-title" className="mt-4 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-4 flex justify-center gap-1.5" aria-label={`${i + 1} ${t.of} ${steps.length}`}>
          {steps.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />)}
        </div>
        <div className="mt-5 flex items-center gap-2">
          {i === 0
            ? <button type="button" onClick={close} className="btn-secondary flex-1">{t.skip}</button>
            : <button type="button" onClick={() => setI(i - 1)} className="btn-secondary flex-1">{t.back}</button>}
          <button type="button" onClick={() => (last ? close() : setI(i + 1))} className="btn-primary flex-1">{last ? t.done : t.next}</button>
        </div>
      </div>
    </div>
  );
}
