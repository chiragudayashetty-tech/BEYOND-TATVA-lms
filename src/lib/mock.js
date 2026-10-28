// Placeholder data so the interface can be reviewed before Supabase is connected.

export const modules = [
  {
    id: "ai-study-hacks",
    title: "AI Study Hacks",
    tagline: "Learn smarter with AI tools",
    color: "#93C5FD",
    lessons: 12,
    progress: 64,
    level: "Grade 8",
    emoji: "📚",
  },
  {
    id: "ai-for-creativity",
    title: "AI for Creativity",
    tagline: "Design, draw and create with AI",
    color: "#A78BFA",
    lessons: 10,
    progress: 30,
    level: "Grade 9",
    emoji: "🎨",
  },
  {
    id: "ai-life-hacks",
    title: "AI Life Hacks",
    tagline: "Everyday AI you can use today",
    color: "#FB7185",
    lessons: 8,
    progress: 0,
    level: "Grade 8",
    emoji: "⚡",
  },
  {
    id: "prompt-engineering",
    title: "Prompt Power",
    tagline: "Talk to AI like a pro",
    color: "#5EEAD4",
    lessons: 9,
    progress: 0,
    level: "Grade 10",
    emoji: "💬",
  },
  {
    id: "build-a-chatbot",
    title: "Build a Chatbot",
    tagline: "Your first AI project",
    color: "#FDE047",
    lessons: 14,
    progress: 0,
    level: "Grade 10",
    emoji: "🤖",
  },
  {
    id: "ai-ethics",
    title: "AI & Me: Ethics",
    tagline: "Using AI the right way",
    color: "#2563EB",
    lessons: 6,
    progress: 100,
    level: "All grades",
    emoji: "🧭",
  },
];

export const lesson = {
  module: "AI Study Hacks",
  title: "Lesson 5 · Summarise any chapter in 2 minutes",
  duration: 90, // seconds, demo length
  checkpoints: [
    {
      at: 25,
      question: "What should you always do after AI summarises a chapter?",
      options: [
        "Copy it straight into my notes",
        "Check it against the textbook",
        "Share it with friends",
      ],
      answer: 1,
    },
    {
      at: 60,
      question: "Which prompt gives a better summary?",
      options: [
        "Summarise this",
        "Summarise this chapter in 5 bullet points for a Grade 8 student",
      ],
      answer: 1,
    },
  ],
  chapters: [
    { title: "Why summaries help", done: true },
    { title: "Picking the right tool", done: true },
    { title: "Writing the prompt", done: true },
    { title: "Checking for mistakes", done: true },
    { title: "Summarise any chapter in 2 minutes", current: true },
    { title: "Turn summaries into flashcards" },
    { title: "Quiz: Study Hacks I", quiz: true },
  ],
  resources: [
    { name: "Prompt cheat-sheet.pdf", type: "PDF" },
    { name: "Practice chapter: Photosynthesis", type: "Doc" },
    { name: "Flashcard template", type: "Sheet" },
  ],
};

// Minutes per day, last 7 days. "app" = time learning in Beyond Tattva.
export const screenTime = [
  { day: "Mon", app: 32, device: 185 },
  { day: "Tue", app: 45, device: 160 },
  { day: "Wed", app: 20, device: 210 },
  { day: "Thu", app: 50, device: 140 },
  { day: "Fri", app: 38, device: 195 },
  { day: "Sat", app: 15, device: 260 },
  { day: "Sun", app: 25, device: 230 },
];

export const students = [
  { name: "Ananya Rao", grade: 9, progress: 82, week: 210, quiz: 91, last: "Today" },
  { name: "Rohan Shetty", grade: 9, progress: 64, week: 165, quiz: 78, last: "Today" },
  { name: "Fathima Begum", grade: 9, progress: 71, week: 190, quiz: 85, last: "Yesterday" },
  { name: "Karthik Nayak", grade: 9, progress: 35, week: 60, quiz: 62, last: "4 days ago" },
  { name: "Sneha Pai", grade: 9, progress: 90, week: 240, quiz: 96, last: "Today" },
  { name: "Arjun Kamath", grade: 9, progress: 18, week: 25, quiz: 54, last: "1 week ago" },
];

export const integrations = [
  { name: "Google Sheets", desc: "Sync students and progress to a sheet", connected: true },
  { name: "Zapier", desc: "Connect to 9,000+ apps", connected: false },
  { name: "HubSpot CRM", desc: "Send school leads and enrolments", connected: false },
  { name: "WhatsApp", desc: "Progress updates to parents", connected: false },
  { name: "Webhooks", desc: "Send events to any system", connected: false },
  { name: "Google Classroom", desc: "Import existing classes and content", connected: false },
];

export const automations = [
  { when: "A student finishes a module", then: "Email certificate + notify parent on WhatsApp", on: true },
  { when: "A student is inactive for 5 days", then: "Remind student and alert teacher", on: true },
  { when: "A new school signs up", then: "Add row to Google Sheet + create CRM deal", on: false },
];
