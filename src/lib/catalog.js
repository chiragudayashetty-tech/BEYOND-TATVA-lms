// The course catalogue: one course. Module 0 (AI 101) is free for every signed-up user;
// modules 1–6 premiere weekly on Sundays at 6 PM IST and need an access key or a payment.
// Placeholder titles until the real module list is set in admin.

export const PRICE_INR = 999; // placeholder price for full access

const raw = {
  id: "ai-for-students",
  title: "AI for Students",
  tagline: "Six weeks to learn, study and create with AI.",
  description:
    "Start free with AI 101, then six modules for Grades 8–10, one premiering every Sunday at 6 PM. Short video lessons, quick checks inside every video, a weekly quiz and a project at the end.",
  grade: "Grades 8–10",
  tags: ["AI basics", "Study skills", "Projects"],
  modules: [
    {
      title: "AI 101",
      blurb: "What AI is, the two free tools you'll use, and how to talk to them.",
      release: "2026-10-18T18:00:00+05:30",
      free: true,
      frames: ["v3-0", "v3-2", "v3-4", "v3-1", "v3-3", "v3-5"],
      hero: "/media/hero3.mp4",
      progress: 100,
      lessons: [
        ["What is AI, really?", 6],
        ["Meet ChatGPT and Gemini", 7],
        ["Free is enough", 5],
        ["Your first conversation with AI", 8],
      ],
    },
    {
      title: "Study smarter with AI",
      blurb: "Understand any chapter faster and check what AI tells you.",
      release: "2026-10-25T18:00:00+05:30",
      frames: ["v1-1", "v1-0", "v1-4", "v1-3", "v1-5", "v1-7", "v1-9", "v1-11", "v1-2", "v1-6"],
      hero: "/media/hero1.mp4",
      video: "/media/lesson1.mp4",
      progress: 50,
      lessons: [
        ["Why AI changes studying", 6],
        ["Open ChatGPT the right way", 8],
        ["Connect it to what you know", 9],
        ["Check AI for mistakes", 7],
      ],
    },
    {
      title: "Exam mode",
      blurb: "Same facts, more marks. Write answers the way examiners mark them.",
      release: "2026-11-01T18:00:00+05:30",
      frames: ["v2-0", "v2-2", "v2-1", "v2-3", "v2-4", "v2-5", "v2-7", "v2-9"],
      hero: "/media/hero2.mp4",
      lessons: [
        ["Knowing vs getting marks", 7],
        ["What the examiner checks", 9],
        ["Structure a 5-mark answer", 10],
        ["Your full-marks checklist", 8],
      ],
    },
    {
      title: "Your AI toolkit",
      blurb: "ChatGPT, Gemini and the free tools that do most of the work.",
      release: "2026-11-08T18:00:00+05:30",
      frames: ["v3-6", "v3-7", "v3-8", "v3-9"],
      lessons: [
        ["Beyond chat: AI apps that help", 6],
        ["Research with AI, safely", 7],
        ["Talking to AI with your voice", 8],
        ["Images from words", 9],
      ],
    },
    {
      title: "Prompt power",
      blurb: "Roles, examples and step-by-step thinking to get exactly what you want.",
      release: "2026-11-15T18:00:00+05:30",
      frames: ["v1-5", "v1-8", "v3-8"],
      lessons: [
        ["What a prompt really is", 7],
        ["Give AI a role", 8],
        ["Show, don't tell: examples", 9],
        ["Fixing bad answers", 9],
      ],
    },
    {
      title: "Create with AI",
      blurb: "Posters, stories and music, and what makes a creation yours.",
      release: "2026-11-22T18:00:00+05:30",
      frames: ["v1-7", "v2-6", "v3-9"],
      lessons: [
        ["Design a poster", 10],
        ["Co-write a short story", 9],
        ["Make a song", 10],
        ["Using AI honestly", 7],
      ],
    },
    {
      title: "Build your first chatbot",
      blurb: "Plan, build and present your own AI project.",
      release: "2026-11-29T18:00:00+05:30",
      frames: ["v3-10", "v3-6", "v2-8"],
      lessons: [
        ["What will your bot do?", 8],
        ["Designing the conversation", 10],
        ["Build and test it", 12],
        ["Demo day", 10],
      ],
    },
  ],
};

let n = 0;
const modules = raw.modules.map((m, mi) => {
  const lessons = m.lessons.map(([title, mins], li) => {
    n += 1;
    const progress = m.progress ?? 0;
    const doneCount = Math.round((progress / 100) * m.lessons.length);
    return {
      n,
      id: `${raw.id}-${n}`,
      title,
      mins,
      module: mi,
      idx: li + 1,
      done: li < doneCount,
      current: progress > 0 && progress < 100 && li === doneCount,
    };
  });
  return {
    n: mi,
    id: `m${mi}`,
    title: m.title,
    blurb: m.blurb,
    release: m.release,
    free: Boolean(m.free),
    frames: m.frames,
    hero: m.hero,
    video: m.video ?? "/media/lesson1.mp4",
    progress: m.progress ?? 0,
    lessons,
    mins: lessons.reduce((a, l) => a + l.mins, 0),
  };
});

const lessons = modules.flatMap((m) => m.lessons);

export const course = {
  ...raw,
  modules,
  chapters: modules, // older name used by a few views
  lessons,
  frames: modules[0].frames,
  lessonCount: lessons.length,
  mins: lessons.reduce((a, l) => a + l.mins, 0),
  progress: Math.round((lessons.filter((l) => l.done).length / lessons.length) * 100),
};

export const courses = [course];
export const getCourse = (id) => (id === course.id ? course : null);
export const getModule = (n) => modules.find((m) => m.n === Number(n));
export const moduleOfLesson = (lesson) => modules.find((m) => m.n === lesson.module);

// Release state of a module at time `now`: "live" or "upcoming". Access is separate (see canWatch).
export const isReleased = (m, now = Date.now()) => new Date(m.release).getTime() <= now;
export const nextPremiere = (now = Date.now()) => modules.find((m) => !isReleased(m, now)) ?? null;

// A student can watch a module when it has premiered and is free or they have full access.
export const canWatch = (m, hasAccess, now = Date.now()) => isReleased(m, now) && (m.free || hasAccess);

export const fmtPremiere = (iso) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
