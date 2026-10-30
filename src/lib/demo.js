// Sample data for screens that are not yet backed by Supabase tables.
// Each block notes the table it will come from once wired.

export const me = {
  streak: 12, // activity_sessions
  xp: 1240,
  level: 6,
  nextLevelXp: 1500,
  rank: 3,
  classSize: 42,
  attendance: 92,
};

export const notifications = [
  { title: "Module 2: Exam mode premieres Sunday at 6 PM", time: "10 min ago", unread: true },
  { title: "Live class starts at 5:00 PM today", time: "1 hour ago", unread: true },
  { title: "Your Module 1 assignment was graded: 18/20", time: "Yesterday", unread: true },
  { title: "You unlocked the Week Warrior badge", time: "2 days ago", unread: false },
];

// live_sessions
export const schedule = [
  { time: "4:00 PM", end: "4:30 PM", title: "AI Study Hacks: Flashcards", host: "Chirag Shetty", kind: "Live class", module: 1 },
  { time: "5:00 PM", end: "5:45 PM", title: "Ask Me Anything: AI careers", host: "Chirag Shetty", kind: "Live class", module: 1 },
  { time: "6:30 PM", end: "7:00 PM", title: "Exam Mode practice round", host: "Self study", kind: "Study block", module: 2 },
];

export const upcomingLive = [
  { day: "Today", time: "5:00 PM", title: "Ask Me Anything: AI careers", host: "Chirag Shetty", module: 1, live: true },
  { day: "Thu", time: "4:30 PM", title: "Build-along: Poster design with AI", host: "Beyond Tatva", module: 5 },
  { day: "Sat", time: "11:00 AM", title: "Exam prep with AI: Science", host: "Beyond Tatva", module: 2 },
];

export const recordings = [
  { title: "How to check AI answers for mistakes", date: "24 Oct", mins: 42, module: 1 },
  { title: "Prompting 101: roles and examples", date: "21 Oct", mins: 38, module: 4 },
  { title: "Deepfakes: how to spot them", date: "17 Oct", mins: 35, module: 1 },
];

// assignments, submissions
export const assignments = [
  { id: "a1", title: "Summarise a Science chapter with AI", module: 1, due: "1 Nov", status: "pending", priority: "High", progress: 60 },
  { id: "a2", title: "Write a 5-mark answer and self-grade", module: 2, due: "3 Nov", status: "pending", priority: "Medium", progress: 20 },
  { id: "a3", title: "Design a poster for Science Day", module: 5, due: "6 Nov", status: "pending", priority: "Low", progress: 0 },
  { id: "a4", title: "Five prompts, five roles", module: 4, due: "25 Oct", status: "graded", score: "18/20", feedback: "Strong role prompts. Add an example to prompt 4." },
  { id: "a5", title: "Spot the deepfake worksheet", module: 1, due: "20 Oct", status: "graded", score: "19/20", feedback: "Excellent reasoning on clue 3." },
  { id: "a6", title: "Flashcards from your notes", module: 1, due: "28 Oct", status: "submitted" },
];

// challenges, challenge_entries
export const challenges = [
  { id: "c1", title: "Prompt Golf", body: "Get the right answer from AI in the fewest words.", xp: 150, level: "Easy", tag: "Prompting", ends: "2 days left", joined: 128 },
  { id: "c2", title: "Fact-check Friday", body: "Find the 3 mistakes hidden in an AI-written paragraph.", xp: 200, level: "Medium", tag: "Thinking", ends: "Ends Friday", joined: 96 },
  { id: "c3", title: "Poster Sprint", body: "Design a school event poster with AI in 30 minutes.", xp: 300, level: "Medium", tag: "Creative", ends: "5 days left", joined: 74 },
  { id: "c4", title: "Bot Builder", body: "Build a chatbot that answers questions about your school.", xp: 500, level: "Hard", tag: "Build", ends: "2 weeks left", joined: 31 },
];

// leaderboard view over xp_events
export const leaderboard = [
  { name: "Sneha Pai", xp: 1580, school: "St. Mary's", change: 1 },
  { name: "Arjun Kamath", xp: 1410, school: "St. Mary's", change: -1 },
  { name: "Ananya Rao", xp: 1240, school: "St. Mary's", change: 2, me: true },
  { name: "Fathima Begum", xp: 1190, school: "St. Mary's", change: 0 },
  { name: "Rohan Shetty", xp: 1050, school: "St. Mary's", change: -2 },
  { name: "Karthik Nayak", xp: 920, school: "St. Mary's", change: 1 },
  { name: "Meghana Bhat", xp: 880, school: "St. Mary's", change: 0 },
  { name: "Vishal Acharya", xp: 760, school: "St. Mary's", change: -1 },
];

// badges, user_badges
export const badges = [
  { id: "streak7", title: "Week Warrior", body: "7-day learning streak", icon: "Flame", earned: true },
  { id: "first", title: "First Steps", body: "Finished your first lesson", icon: "Footprints", earned: true },
  { id: "quiz", title: "Quiz Ace", body: "Scored 100% on 3 quizzes", icon: "Target", earned: true },
  { id: "early", title: "Early Bird", body: "Studied before 8 AM five times", icon: "Sunrise", earned: true },
  { id: "course", title: "Course Complete", body: "Finished a full course", icon: "GraduationCap", earned: true },
  { id: "helper", title: "Helping Hand", body: "Answered 10 classmate questions", icon: "HeartHandshake", earned: false, progress: 60 },
  { id: "streak30", title: "Unstoppable", body: "30-day learning streak", icon: "Zap", earned: false, progress: 40 },
  { id: "builder", title: "Builder", body: "Completed a Build challenge", icon: "Hammer", earned: false, progress: 0 },
];

// activity_sessions grouped by day (minutes)
export const week = [
  { label: "Mon", value: 32, device: 185 },
  { label: "Tue", value: 45, device: 160 },
  { label: "Wed", value: 20, device: 210 },
  { label: "Thu", value: 50, device: 140 },
  { label: "Fri", value: 38, device: 195 },
  { label: "Sat", value: 15, device: 260 },
  { label: "Sun", value: 25, device: 230 },
];

export const scoreTrend = { points: [58, 64, 61, 70, 74, 72, 81, 85], labels: ["Sep 1", "Sep 15", "Oct 1", "Oct 15", "Oct 29"] };

// study_plan_items
export const planner = {
  days: [
    { d: "Mon", n: 27 }, { d: "Tue", n: 28 }, { d: "Wed", n: 29 }, { d: "Thu", n: 30, today: true }, { d: "Fri", n: 31 }, { d: "Sat", n: 1 }, { d: "Sun", n: 2 },
  ],
  today: [
    { time: "4:00 PM", end: "4:30 PM", title: "AI Study Hacks: Lesson 6", kind: "Lesson", done: true },
    { time: "5:00 PM", end: "5:45 PM", title: "Live: AI careers AMA", kind: "Live" },
    { time: "6:30 PM", end: "7:00 PM", title: "Exam Mode practice round", kind: "Practice" },
    { time: "7:30 PM", end: "7:45 PM", title: "Review flashcards", kind: "Revision" },
  ],
};

export const goals = [
  { title: "Finish Module 1 before Sunday", target: "2 lessons left", value: 50 },
  { title: "Learn 30 minutes a day", target: "This week: 4 of 7 days", value: 57 },
  { title: "Score 90% in module quizzes", target: "Current average: 85%", value: 85 },
];

// parent view
export const child = { name: "Ananya Rao", grade: 9, school: "St. Mary's School, Udupi", quizAvg: 91, lessons: 18 };

// teacher view: enrollments + lesson_progress
export const students = [
  { name: "Ananya Rao", progress: 82, week: 210, quiz: 91, last: "Today", status: "active" },
  { name: "Rohan Shetty", progress: 64, week: 165, quiz: 78, last: "Today", status: "active" },
  { name: "Fathima Begum", progress: 71, week: 190, quiz: 85, last: "Yesterday", status: "active" },
  { name: "Karthik Nayak", progress: 35, week: 60, quiz: 62, last: "4 days ago", status: "slipping" },
  { name: "Sneha Pai", progress: 90, week: 240, quiz: 96, last: "Today", status: "active" },
  { name: "Arjun Kamath", progress: 18, week: 25, quiz: 54, last: "1 week ago", status: "inactive" },
];

export const integrations = [
  { name: "Google Sheets", desc: "Sync students and progress to a sheet", icon: "Sheet", connected: true },
  { name: "Zapier", desc: "Connect to 9,000+ apps", icon: "Zap", connected: false },
  { name: "HubSpot CRM", desc: "Send school leads and enrolments", icon: "Building2", connected: false },
  { name: "WhatsApp", desc: "Progress updates to parents", icon: "MessageCircle", connected: false },
  { name: "Webhooks", desc: "Send events to any system", icon: "Webhook", connected: false },
  { name: "Google Classroom", desc: "Import classes and content", icon: "School", connected: false },
];

export const automations = [
  { when: "A student finishes a course", then: "Email the certificate and notify the parent on WhatsApp", on: true },
  { when: "A student is inactive for 5 days", then: "Remind the student and alert their teacher", on: true },
  { when: "A new school signs up", then: "Add a row to Google Sheets and create a CRM deal", on: false },
];
