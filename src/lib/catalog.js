// Course catalogue (placeholder until it is stored in Supabase).
// Courses play the role of "shows", chapters are "seasons", lessons are "episodes".

const raw = [
  {
    id: "ai-study-hacks",
    title: "AI Study Hacks",
    tagline: "Learn smarter, not longer.",
    description:
      "Turn any textbook chapter into summaries, flashcards and practice tests in minutes. The study toolkit every Grade 8 student wishes they had.",
    color: "#4F46E5",
    color2: "#93C5FD",
    art: "rings",
    frames: ["v1-1", "v1-0", "v1-4", "v1-3", "v1-5", "v1-7", "v1-9", "v1-11", "v1-2", "v1-6", "v1-8", "v1-10"],
    hero: "/media/hero1.mp4",
    grade: "Grade 8",
    tags: ["Study skills", "Productivity"],
    progress: 64,
    top: 1,
    chapters: [
      {
        title: "Getting started",
        lessons: [
          ["Why AI changes studying", 6],
          ["Meet your AI study buddy", 8],
          ["Writing your first prompt", 9],
          ["Checking AI for mistakes", 7],
        ],
      },
      {
        title: "Study superpowers",
        lessons: [
          ["Summarise any chapter in 2 minutes", 10],
          ["Turn summaries into flashcards", 8],
          ["Make your own practice test", 11],
          ["Revision plans that stick", 9],
        ],
      },
    ],
  },
  {
    id: "ai-for-creativity",
    title: "AI for Creativity",
    tagline: "Design. Draw. Create.",
    description:
      "Make posters, comics, music and stories with AI as your creative partner, and learn what makes a creation truly yours.",
    color: "#7C3AED",
    color2: "#A78BFA",
    art: "orbs",
    frames: ["v1-7", "v1-9", "v1-6"],
    grade: "Grade 9",
    tags: ["Design", "Creative"],
    progress: 30,
    top: 2,
    isNew: true,
    chapters: [
      {
        title: "Visual creation",
        lessons: [
          ["Images from words", 9],
          ["Designing a poster", 12],
          ["Comics with AI", 10],
        ],
      },
      {
        title: "Sound and story",
        lessons: [
          ["Make a song with AI", 11],
          ["Co-writing a short story", 10],
          ["Your creative portfolio", 8],
        ],
      },
    ],
  },
  {
    id: "exam-mode",
    title: "Exam Mode",
    tagline: "Same facts. More marks.",
    description:
      "Knowing it is not the same as scoring it. Use AI to learn how examiners mark, structure 5-mark answers and practise until full marks feel easy.",
    frames: ["v2-0", "v2-2", "v2-1", "v2-3", "v2-4", "v2-5", "v2-7", "v2-9", "v2-6", "v2-8"],
    hero: "/media/hero2.mp4",
    color: "#E11D48",
    color2: "#FB7185",
    art: "waves",
    grade: "Grade 9",
    tags: ["Exam prep", "Writing"],
    progress: 0,
    top: 3,
    isNew: true,
    chapters: [
      {
        title: "Think like an examiner",
        lessons: [
          ["Knowing vs getting marks", 7],
          ["Same facts, different marks", 8],
          ["What the examiner checks", 9],
        ],
      },
      {
        title: "Write for full marks",
        lessons: [
          ["Structure a 5-mark answer", 10],
          ["Your full-marks checklist", 8],
          ["Practise with AI as examiner", 11],
        ],
      },
    ],
  },
  {
    id: "prompt-power",
    title: "Prompt Power",
    tagline: "Talk to AI like a pro.",
    description:
      "The art and science of prompting. Roles, examples, step-by-step thinking, and how to get exactly what you want.",
    color: "#0D9488",
    color2: "#5EEAD4",
    art: "grid",
    frames: ["v3-0", "v3-2", "v3-4", "v3-1", "v3-3", "v3-5", "v3-6", "v3-7", "v3-8", "v3-9"],
    hero: "/media/hero3.mp4",
    grade: "Grade 10",
    tags: ["Core skill"],
    progress: 12,
    top: 4,
    chapters: [
      {
        title: "Prompt foundations",
        lessons: [
          ["What a prompt really is", 7],
          ["Give AI a role", 8],
          ["Show, don't tell: examples", 9],
          ["Step-by-step thinking", 10],
          ["Fixing bad answers", 9],
        ],
      },
    ],
  },
  {
    id: "build-a-chatbot",
    title: "Build a Chatbot",
    tagline: "Your first AI project.",
    description:
      "Design, build and launch your own chatbot without heavy coding. Present it to your class at the end.",
    color: "#CA8A04",
    color2: "#FDE047",
    art: "grid",
    grade: "Grade 10",
    frames: ["v3-2", "v3-6", "v3-10"],
    tags: ["Project", "Build"],
    progress: 0,
    top: 5,
    chapters: [
      {
        title: "Plan it",
        lessons: [
          ["What will your bot do?", 8],
          ["Designing the conversation", 10],
        ],
      },
      {
        title: "Build it",
        lessons: [
          ["Your first bot", 12],
          ["Giving it knowledge", 11],
          ["Testing with friends", 9],
          ["Demo day", 10],
        ],
      },
    ],
  },
  {
    id: "ai-and-me",
    title: "AI & Me",
    tagline: "Using AI the right way.",
    description:
      "Bias, privacy, deepfakes and honesty. Become the person who knows how to use AI responsibly.",
    color: "#2563EB",
    color2: "#60A5FA",
    art: "rings",
    grade: "All grades",
    frames: ["v2-3", "v2-2"],
    tags: ["Ethics", "Safety"],
    progress: 100,
    chapters: [
      {
        title: "Responsible AI",
        lessons: [
          ["Can AI be unfair?", 8],
          ["Your data, your privacy", 9],
          ["Spotting deepfakes", 10],
          ["AI and honesty at school", 7],
        ],
      },
    ],
  },
  {
    id: "ai-in-science",
    title: "AI in Science",
    tagline: "Experiments with a robot lab partner.",
    description: "Use AI to explain, simulate and explore science topics from your syllabus.",
    color: "#059669",
    color2: "#34D399",
    art: "orbs",
    grade: "Grade 9",
    frames: ["v1-3", "v1-9", "v1-8"],
    tags: ["Science"],
    progress: 0,
    isNew: true,
    chapters: [
      {
        title: "Lab partner",
        lessons: [
          ["Explain it like I'm 12", 7],
          ["Simulate an experiment", 10],
          ["Science project ideas", 8],
        ],
      },
    ],
  },
  {
    id: "data-detectives",
    title: "Data Detectives",
    tagline: "Find the story in the numbers.",
    description: "Charts, patterns and predictions. How AI learns from data, and how you can too.",
    color: "#DB2777",
    color2: "#F9A8D4",
    art: "waves",
    grade: "Grade 10",
    frames: ["v2-1", "v2-4"],
    tags: ["Data"],
    progress: 0,
    chapters: [
      {
        title: "Data basics",
        lessons: [
          ["What is data?", 6],
          ["Patterns everywhere", 8],
          ["How AI learns", 10],
          ["Make a prediction", 9],
        ],
      },
    ],
  },
];

export const courses = raw.map((c) => {
  let n = 0;
  const chapters = c.chapters.map((ch) => ({
    title: ch.title,
    lessons: ch.lessons.map(([title, mins]) => {
      n += 1;
      return { n, id: `${c.id}-${n}`, title, mins };
    }),
  }));
  const lessons = chapters.flatMap((ch) => ch.lessons);
  const done = Math.round((c.progress / 100) * lessons.length);
  lessons.forEach((l, i) => {
    l.done = i < done;
    l.current = i === done && c.progress > 0 && c.progress < 100;
  });
  return {
    ...c,
    chapters,
    lessons,
    lessonCount: lessons.length,
    mins: lessons.reduce((a, l) => a + l.mins, 0),
  };
});

export const getCourse = (id) => courses.find((c) => c.id === id);

export const continueWatching = courses.filter((c) => c.progress > 0 && c.progress < 100);
export const top10 = courses.filter((c) => c.top).sort((a, b) => a.top - b.top);
export const newReleases = courses.filter((c) => c.isNew);
export const featured = courses.filter((c) => c.hero);

export const liveSessions = [
  { title: "Ask Me Anything: AI careers", when: "Today · 5:00 PM", host: "Chirag", courseId: "ai-and-me" },
  { title: "Build-along: Poster design", when: "Thu · 4:30 PM", host: "Beyond Tattva", courseId: "ai-for-creativity" },
  { title: "Exam prep with AI", when: "Sat · 11:00 AM", host: "Beyond Tattva", courseId: "ai-study-hacks" },
];
