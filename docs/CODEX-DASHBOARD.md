# Codex tasks: student dashboard + Studio insights

_Claude (lead), 2026-11-02, updated after Chirag's decisions. UI only. All data is ready on `main`
(migrations 9–10, helpers in `src/lib/data.js`). Read `AGENTS.md` first. Mobile first: 320, 375, 430 px._

The four reference dashboards Chirag shared are a **style guide only** (big friendly cards, rings, clear
"Continue" button, playful greeting). Their numbers are **not** a list to copy. Show only what's below.

---

## Task 1: `codex/student-dashboard` (`/browse`)

### Data (server component)
```js
import { getCourse, getLearningStats, getLeaderboard } from "@/lib/data";
const [course, stats, board] = await Promise.all([getCourse(), getLearningStats(), getLeaderboard()]);
// stats: { xp, xp_breakdown: { checks, quizzes, assignments, total }, minutes_total, lessons_done,
//          quizzes_passed, assignments_graded, checks_answered, checks_correct }   (null on error)
// board: { top: [{ rank, name: "Asha R.", xp, me }], me: { rank, xp, hidden } | null, players }   (null on error)
```
Either can be `null`: hide that card, never crash. Remove `getStudentStats()` from this page.

### Layout (phones top to bottom; 2 columns from `xl`)
1. **Greeting:** "Hi {first name}!" + short bubble: "You have {xp} XP. Earn more in quick checks, quizzes and assignments."
   No new images (lucide icon or existing `Logo` mark).
2. **Three ring cards** (`Ring` from `ui.js`; 1 column at 320 px, 3 in a row from `sm`):
   - **Course:** `{course.progress}%`, "{lessons_done} of {lessonCount} lessons".
   - **XP:** `{xp}`, "Rank #{board.me.rank} of {board.players}" (if `board.me`), else "Earn XP to join the leaderboard".
   - **Quick checks:** `{checks_correct}/{checks_answered}` right (ring = %); hide if 0 answered.
3. **Continue card:** existing `ContinueHero`, button full width on phones.
4. **XP leaderboard card** ("Top learners"):
   - Top 10 from `board.top`: rank, name, XP. Ranks 1–3 get a small medal (lucide `Medal`/`Trophy`, colours from tokens).
   - The viewer's row (`me: true`) is highlighted. If the viewer isn't in the top 10, add a separated last row "You · #{rank} · {xp} XP".
   - **No photos, no avatars with initials of others, no school names.** Names come already shortened; show them as-is.
   - Under the list: "How to earn XP: 10 per right quick check · quiz XP when you pass · up to 50 per marked assignment."
   - If `board.me?.hidden`: show "You're hidden from the leaderboard" + link to Profile.
5. **"Where your XP came from":** three small rows or a `Bars` chart from `xp_breakdown` (Quick checks / Quizzes / Assignments).
6. Keep below: free-plan banner (top), `PremiereCard`, "Your journey" module row.

### Profile page addition
On `/profile`, a switch **"Show me on the leaderboard"** (default on). Calls
`createClient().rpc("set_leaderboard_hidden", { p_hidden: !checked })`, then `router.refresh()`. Use the same
switch style as `ThemeSwitch` (44 px tap area, `aria-label`).

### Do NOT build
- **Streaks, streak calendars, weekly minutes/hours charts** (Chirag: one module a week, so they mislead).
- Photos or full names of other students; school/class of other students.
- Premium/price upsells, AI assistant, search, notifications bell, ratings, made-up numbers.
- New dependencies, images, fonts, colours outside existing tokens.

---

## Task 2: `codex/studio-insights` (`/admin/analytics`, admin only)

Keep the existing cards (funnel, sources, grades, revenue, module completion, quiz health). Add a section
**"Insights"** below them using `const insights = await getInsights(days)` (same date range as the page).
`null` → one `Empty` card "Insights unavailable".

`insights` = `{ engagement: { students, active_7d, active_30d, minutes_per_active_7d, stopped_paid, never_started_paid },
lessons: [{ module, lesson, started, finished }], sources: [{ source, signups, paid }], refunds: { count, paise },
schools: [{ school, keys, used, students }], workshops: [{ title, starts_at, seats, registered, attended, signed_up, paid }] }`

1. **Engagement:** 4 `StatCard`s: "Active this week" (`active_7d` of `students`), "Active this month",
   "Avg minutes per active student (7 days)", "Paid but stopped 14+ days" (`stopped_paid`, tone danger,
   link to `/admin/pipeline?stalled=1`). Small line under it: "{never_started_paid} paid students never started".
2. **Lesson drop-off:** list in order, "M{module} · {lesson}" + bar of `finished/started` and "{started} started · {finished} finished".
   Highlight the 3 lessons with the lowest finish rate (min 3 started) as "Fix first".
3. **Sources that pay:** table source / sign-ups / paid / conversion % (sorted by paid). Empty → `Empty`.
4. **Refunds:** `StatCard` "Refunds" `{count}` · ₹`{paise/100}`.
5. **Schools:** table school / keys issued / used / % used / students. Phones: stacked rows, no sideways scroll.
6. **Workshops:** per workshop: date, `registered/seats`, attended, signed up, paid, as a 4-step mini funnel.

---

## Done when (both tasks)
- `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` pass (no small/covered tap targets, no sideways scroll at 320 px).
- Works in dark mode. PR has screenshots at 375 px and 1280 px.
- Copy: short, friendly, plain English. One PR per task, each ending "Ready for Claude's review."
