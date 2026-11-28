"use client";

import FactLoader from "@/components/FactLoader";
import { startNavLoader } from "@/components/TopLoader";
import { track } from "@/lib/track-client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, GraduationCap, House, KeyRound, RotateCcw, School, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { TermsList } from "@/components/TeacherTerms";

// Sign-up as a short chat with Loki (like the website): one question at a time, tap answers,
// a small Kannada line under every question. One account per student; a parent can set it up.
// School key is asked only when Studio made unused keys for the picked school (signup_schools.has_keys).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const digits = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const first = (n) => String(n || "").trim().split(/\s+/)[0];

export default function OnboardingChat({ defaultName, next, signedInAs, loginPhone }) {
  const router = useRouter();
  const [log, setLog] = useState([]); // { from: "loki" | "me", en, kn? , note? }
  const [typing, setTyping] = useState(false);
  const [ask, setAsk] = useState(null); // current question id
  const [a, setA] = useState({}); // answers
  const [schools, setSchools] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [field2, setField2] = useState("");
  const started = useRef(false);

  useEffect(() => {
    let on = true;
    createClient().rpc("signup_schools").then(({ data, error }) => { if (on) setSchools(error ? [] : data ?? []); }).catch(() => on && setSchools([]));
    return () => { on = false; };
  }, []);


  async function say(en, kn, note) {
    setAsk(null);
    setTyping(true);
    await sleep(Math.min(900, 350 + en.length * 12));
    setTyping(false);
    setLog((l) => [...l, { from: "loki", en, kn, note }]);
  }
  const me = (text) => setLog((l) => [...l, { from: "me", en: text }]);
  const go = (id, value = "") => { setField(value); setField2(""); setError(""); setAsk(id); };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await say("Hi! I'm Loki 👋 Let's set up your course. It takes 1 minute.", "ನಮಸ್ಕಾರ! ನಾನು ಲೋಕಿ. ಒಂದು ನಿಮಿಷದಲ್ಲಿ ಕೋರ್ಸ್ ಸಿದ್ಧ ಮಾಡೋಣ.");
      await say("Who is setting up?", "ಯಾರು ಸೈನ್ ಅಪ್ ಮಾಡುತ್ತಿದ್ದೀರಿ?");
      go("who");
    })();
  }, []);

  const parent = a.who === "parent";
  const teacher = a.who === "teacher";

  async function pickWho(who, label) {
    me(label);
    setA({ who });
    if (who === "teacher") {
      await say("Welcome, teacher! What's your full name?", "ಸ್ವಾಗತ! ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು?");
      return go("tName", defaultName);
    }
    await say(who === "parent" ? "Welcome! Which class is your child in?" : "A curious student, I like you already! Which class are you in?",
      who === "parent" ? "ನಿಮ್ಮ ಮಗು ಯಾವ ತರಗತಿಯಲ್ಲಿದೆ?" : "ನೀವು ಯಾವ ತರಗತಿಯಲ್ಲಿದ್ದೀರಿ?");
    go("grade");
  }

  async function pickGrade(g) {
    me(`Class ${g}`);
    setA((x) => ({ ...x, grade: g }));
    const cheer = { 8: "Class 8, a smart time to start!", 9: "Class 9, perfect year to build skills.", 10: "Class 10, board year! Let's make it count." }[g];
    await say(`${cheer} ${parent ? "What's your child's full name?" : "What's your full name?"}`, parent ? "ನಿಮ್ಮ ಮಗುವಿನ ಪೂರ್ಣ ಹೆಸರು?" : "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು?");
    go("name", parent ? "" : defaultName);
  }

  async function sendName(e) {
    e.preventDefault();
    const name = field.trim();
    if (name.length < 2) return setError("Please type the full name.");
    me(name);
    setA((x) => ({ ...x, name }));
    await say(`Nice to meet ${parent ? "" : "you, "}${first(name)}! Which school${parent ? " does " + first(name) + " go to" : " are you in"}?`, "ಯಾವ ಶಾಲೆ?");
    go("school");
  }

  async function pickSchool(s) {
    if (s === "other") return go("schoolOther");
    me(s.name);
    setA((x) => ({ ...x, schoolPick: s.id, school: "" }));
    if (s.has_keys) {
      await say(`Did ${s.name} give you a course key? Type it to unlock the course right away.`, "ಶಾಲೆ ಕೊಟ್ಟ ಕೀ ಇದ್ದರೆ ಇಲ್ಲಿ ಬರೆಯಿರಿ.");
      return go("key");
    }
    return askParent();
  }

  async function sendSchoolOther(e) {
    e.preventDefault();
    const school = field.trim();
    if (school.length < 3) return setError("Please type the school name.");
    me(school);
    setA((x) => ({ ...x, schoolPick: null, school }));
    askParent();
  }

  async function sendKey(e) {
    e?.preventDefault();
    const key = field.trim().toUpperCase();
    me(key || "No key");
    setA((x) => ({ ...x, key }));
    askParent();
  }

  async function askParent() {
    await say(parent ? "Your name, please?" : "What's your parent's or guardian's name?", parent ? "ನಿಮ್ಮ ಹೆಸರು?" : "ಪೋಷಕರ ಹೆಸರು?");
    go("gName", parent ? defaultName : "");
  }

  async function sendGName(e) {
    e.preventDefault();
    const gName = field.trim();
    if (gName.length < 2) return setError("Please type a name.");
    me(gName);
    setA((x) => ({ ...x, gName }));
    await say(parent ? "Your WhatsApp number? Course updates and help come here." : "Your parent's WhatsApp number? Course updates come here.",
      "WhatsApp ನಂಬರ್ (ಕೋರ್ಸ್ ಮಾಹಿತಿ ಇಲ್ಲಿಗೆ ಬರುತ್ತದೆ)");
    go("phone", parent && loginPhone ? digits(loginPhone) : "");
  }

  async function sendPhone(e) {
    e.preventDefault();
    const p = digits(field);
    if (!/^[6-9]\d{9}$/.test(p)) return setError("Enter a 10-digit WhatsApp number.");
    me(`+91 ${p}`);
    setA((x) => ({ ...x, gPhone: p }));
    await say(parent ? `Does ${first(a.name)} have their own WhatsApp? Course tips and XP updates go there. (Optional)` : "Do you have your own WhatsApp? Course tips and XP updates come here. (Optional)",
      "ವಿದ್ಯಾರ್ಥಿಯ ಸ್ವಂತ WhatsApp ನಂಬರ್ (ಐಚ್ಛಿಕ)");
    go("sPhone");
  }

  async function sendStudentPhone(e) {
    e?.preventDefault();
    const p = digits(field);
    if (p && !/^[6-9]\d{9}$/.test(p)) return setError("Enter a 10-digit WhatsApp number, or tap Skip.");
    const own = p && p !== a.gPhone ? p : "";
    me(own ? `+91 ${own}` : "Skip");
    setA((x) => ({ ...x, sPhone: own }));
    if (parent) {
      await say(`Important: ${first(a.name)} must watch the course signed in with this same login.`, "ಮಗು ಇದೇ ನಂಬರ್/ಲಾಗಿನ್ ಬಳಸಿ ಕೋರ್ಸ್ ನೋಡಬೇಕು.", signedInAs);
    }
    await say(parent ? `Last one: do you agree to ${first(a.name)} using Beyond Tatva?` : "Last one: does your parent know you're joining and agree?",
      parent ? "ನಿಮ್ಮ ಮಗು ಬಿಯಾಂಡ್ ತತ್ವ ಬಳಸಲು ಒಪ್ಪಿಗೆ ಇದೆಯೇ?" : "ನಿಮ್ಮ ಪೋಷಕರಿಗೆ ಗೊತ್ತಿದೆ ಮತ್ತು ಒಪ್ಪಿಗೆ ಇದೆಯೇ?");
    go("consent");
  }

  async function sendTeacher(e) {
    e.preventDefault();
    const name = field.trim(), code = field2.trim();
    if (name.length < 2 || !code) return setError("Enter your name and teacher code.");
    me(`${name} · ${code.toUpperCase()}`);
    setA((x) => ({ ...x, name, code }));
    await say("Please read and accept the teacher terms.", "ಶಿಕ್ಷಕರ ನಿಯಮಗಳನ್ನು ಓದಿ ಒಪ್ಪಿಕೊಳ್ಳಿ.");
    go("terms");
  }

  async function finish() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("complete_onboarding", teacher
      ? { p_role: "teacher", p_full_name: a.name, p_code: a.code, p_consent: true }
      : {
          p_role: "student",
          p_full_name: a.name,
          p_grade: Number(a.grade),
          p_guardian_name: a.gName,
          p_guardian_phone: a.gPhone,
          p_student_phone: a.sPhone || null,
          p_school_name: a.schoolPick ? null : a.school || null,
          p_school_pick: a.schoolPick || null,
          p_signed_up_by: a.who,
          p_consent: true,
        });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    track("onboarding_completed", { role: teacher ? "teacher" : "student", grade: teacher ? null : Number(a.grade) || null, $set: { role: teacher ? "teacher" : "student", grade: teacher ? null : Number(a.grade) || null } });
    let to = next ?? "/dashboard";
    if (!teacher) {
      await supabase.rpc("claim_purchases"); // paid on /pay or the website before signing up? unlock now
      if (a.key) {
        const { error: keyError } = await supabase.rpc("redeem_access_key", { p_code: a.key });
        if (keyError) to = "/unlock"; // wrong key: they can retype it in the key box there
      }
      try {
        const tags = JSON.parse(localStorage.getItem("bt_signup_source") ?? "null");
        if (tags) {
          const { src, ...utm } = tags;
          await supabase.rpc("record_signup_source", { p_source: src ?? null, p_utm: utm });
          localStorage.removeItem("bt_signup_source");
        }
      } catch {}
    }
    startNavLoader();
    router.replace(to);
    router.refresh();
    setTimeout(() => { if (window.location.pathname.startsWith("/onboarding")) window.location.assign(to); }, 8000);
  }

  function restart() {
    setLog([]); setA({}); setError(""); started.current = false;
    (async () => { await say("No problem, let's start again. Who is setting up?", "ಮತ್ತೆ ಆರಂಭಿಸೋಣ. ಯಾರು ಸೈನ್ ಅಪ್ ಮಾಡುತ್ತಿದ್ದೀರಿ?"); go("who"); })();
  }

  const steps = teacher ? ["who", "tName", "terms"] : ["who", "grade", "name", "school", "gName", "phone", "sPhone", "consent"];
  const at = Math.max(0, steps.indexOf(ask === "schoolOther" || ask === "key" ? "school" : ask));

  // One question at a time in one box (like the website): only Loki's newest lines, then the answer controls.
  const lastMe = log.map((m) => m.from).lastIndexOf("me");
  const current = log.slice(lastMe + 1);
  const answered = lastMe >= 0 ? log[lastMe].en : "";
  const step = Math.min(at + 1, steps.length);

  return (
    <>
      {busy && <FactLoader title="Setting up your course… please don't close this page." />}
      <div className="grid min-h-dvh place-items-center bg-bg px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-5 flex justify-center"><Logo /></div>
          <div className="card overflow-hidden shadow-xl shadow-black/5">
            <div className="px-5 pt-5 sm:px-6">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Step {step} of {steps.length} <span lang="kn" className="font-normal">· ಹಂತ {step}/{steps.length}</span></span>
                {log.length > 2 && !busy && <button type="button" onClick={restart} className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-surface-2"><RotateCcw className="h-3.5 w-3.5" /> Start again</button>}
              </div>
              <div className="mt-2 flex gap-1.5" aria-hidden="true">
                {steps.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i < step - (ask ? 1 : 0) ? "bg-success" : i === step - 1 && ask ? "bg-primary" : "bg-border"}`} />)}
              </div>
            </div>

            <div key={lastMe} className="animate-[chat-in_.35s_ease-out] px-5 pb-6 pt-5 sm:px-6">
              {answered && <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" /> {answered}</p>}
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- small static mascot */}
                <img src="/brand/loki.webp" alt="Loki" width={48} height={50} className="h-12 w-12 shrink-0 animate-[loki-bob_3s_ease-in-out_infinite]" />
                <div className="min-w-0 flex-1 space-y-2 pt-1" aria-live="polite">
                  {current.map((m, i) => (
                    <div key={i} className="animate-[chat-in_.3s_ease-out]">
                      <p className={i === current.length - 1 ? "text-lg font-semibold leading-snug" : "text-[15px] text-muted"}>{m.en}</p>
                      {m.note && <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold">{m.note}</p>}
                      {m.kn && <p lang="kn" className="mt-0.5 text-xs text-muted">{m.kn}</p>}
                    </div>
                  ))}
                  {typing && (
                    <div className="flex gap-1 py-2" aria-label="Loki is typing">
                      {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 0.15}s` }} />)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
            {error && <p role="alert" className="mb-3 animate-[chat-in_.2s] rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
            {ask === "who" && (
              <div className="grid gap-2">
                {[["student", GraduationCap, "I'm the student", "ನಾನು ವಿದ್ಯಾರ್ಥಿ"], ["parent", House, "I'm a parent", "ನಾನು ಪೋಷಕ"], ["teacher", Users, "I'm a teacher", "ನಾನು ಶಿಕ್ಷಕ"]].map(([id, Icon, en, kn]) => (
                  <Chip key={id} onClick={() => pickWho(id, en)} icon={Icon} en={en} kn={kn} />
                ))}
              </div>
            )}
            {ask === "grade" && (
              <div className="grid grid-cols-3 gap-2">
                {["8", "9", "10"].map((g) => (
                  <button key={g} type="button" onClick={() => pickGrade(g)} className="rounded-2xl border-2 border-border bg-surface py-3 transition active:scale-95 hover:border-primary hover:bg-primary-soft">
                    <span className="block text-2xl font-bold">{g}</span><span lang="kn" className="text-xs text-muted">{g}ನೇ ತರಗತಿ</span>
                  </button>
                ))}
              </div>
            )}
            {(ask === "name" || ask === "gName" || ask === "schoolOther") && (
              <Field onSubmit={ask === "name" ? sendName : ask === "gName" ? sendGName : sendSchoolOther} value={field} onChange={setField}
                placeholder={ask === "name" ? (parent ? "Child's full name" : "Your full name") : ask === "gName" ? (parent ? "Your name" : "Parent's name") : "School name, town"} autoComplete={ask === "schoolOther" ? "off" : "name"} />
            )}
            {ask === "school" && (
              <div className="space-y-2">
                {/* Only the school list scrolls; "not here" always stays in view (it was cut off at 375px). */}
                <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                  {schools === null && <p className="text-sm text-muted">Loading schools…</p>}
                  {schools?.map((s) => <Chip key={s.id} onClick={() => pickSchool(s)} icon={School} en={s.name} />)}
                </div>
                <Chip onClick={() => pickSchool("other")} icon={School} en="My school isn't here" kn="ನನ್ನ ಶಾಲೆ ಇಲ್ಲಿಲ್ಲ" />
              </div>
            )}
            {ask === "key" && (
              <form onSubmit={sendKey} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                    <input className="input !pl-10 uppercase tracking-wider" value={field} onChange={(e) => setField(e.target.value)} placeholder="Course key" autoComplete="off" autoFocus />
                  </div>
                  <button className="btn-primary px-4" aria-label="Send"><ArrowRight className="h-5 w-5" /></button>
                </div>
                <button type="button" onClick={() => { setField(""); setA((x) => ({ ...x, key: "" })); me("I don't have a key"); askParent(); }} className="w-full py-2 text-sm text-muted underline">I don&apos;t have a key</button>
              </form>
            )}
            {ask === "phone" && (
              <form onSubmit={sendPhone} className="flex gap-2">
                <div className="relative flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pay/whatsapp.svg" alt="" className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2" />
                  <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-lg text-muted">+91</span>
                  <input className="input !pl-[5.25rem] text-lg" type="tel" inputMode="numeric" maxLength={10} value={field} onChange={(e) => setField(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="WhatsApp number" autoComplete="tel-national" autoFocus />
                </div>
                <button className="btn-primary px-4" aria-label="Send"><ArrowRight className="h-5 w-5" /></button>
              </form>
            )}
            {ask === "sPhone" && (
              <form onSubmit={sendStudentPhone} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/pay/whatsapp.svg" alt="" className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2" />
                    <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-lg text-muted">+91</span>
                    <input className="input !pl-[5.25rem] text-lg" type="tel" inputMode="numeric" maxLength={10} value={field} onChange={(e) => setField(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Student's WhatsApp" autoComplete="off" autoFocus />
                  </div>
                  <button className="btn-primary px-4" aria-label="Send"><ArrowRight className="h-5 w-5" /></button>
                </div>
                <button type="button" onClick={() => { setField(""); sendStudentPhone(); }} className="btn-secondary w-full">Skip · ಬೇಡ</button>
              </form>
            )}
            {ask === "consent" && (
              <div className="grid gap-2">
                <p className="text-center text-xs text-muted">By agreeing, the parent or guardian accepts our <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">Terms</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">Privacy policy</a>.</p>
                <button type="button" disabled={busy} onClick={() => { me("Yes, I agree ✅"); finish(); }} className="btn-primary w-full py-3.5 text-base"><Check className="h-5 w-5" /> Yes, I agree · Start the course</button>
                <p lang="kn" className="text-center text-xs text-muted">ಹೌದು, ಒಪ್ಪುತ್ತೇನೆ · ಕೋರ್ಸ್ ಆರಂಭಿಸಿ</p>
              </div>
            )}
            {ask === "tName" && (
              <form onSubmit={sendTeacher} className="space-y-2">
                <input className="input" value={field} onChange={(e) => setField(e.target.value)} placeholder="Your full name" maxLength={80} autoFocus />
                <div className="flex gap-2">
                  <input className="input flex-1 uppercase tracking-wider" value={field2} onChange={(e) => setField2(e.target.value)} placeholder="Teacher code" />
                  <button className="btn-primary px-4" aria-label="Send"><ArrowRight className="h-5 w-5" /></button>
                </div>
              </form>
            )}
            {ask === "terms" && (
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border p-3 text-sm"><TermsList /></div>
                <button type="button" disabled={busy} onClick={() => { me("I agree"); finish(); }} className="btn-primary w-full py-3">I agree to the teacher terms</button>
              </div>
            )}
            {!ask && !busy && error && <button type="button" onClick={finish} className="btn-primary w-full">Try again</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Chip({ onClick, icon: Icon, en, kn }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-left transition active:scale-[.98] hover:border-primary hover:bg-primary-soft">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block font-semibold">{en}</span>{kn && <span lang="kn" className="text-xs text-muted">{kn}</span>}</span>
    </button>
  );
}

function Field({ onSubmit, value, onChange, placeholder, autoComplete }) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input className="input flex-1 text-base" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={120} autoComplete={autoComplete} autoFocus />
      <button className="btn-primary px-4" aria-label="Send"><ArrowRight className="h-5 w-5" /></button>
    </form>
  );
}
