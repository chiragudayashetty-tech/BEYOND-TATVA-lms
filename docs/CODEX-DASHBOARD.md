# Codex task: student dashboard redesign (`codex/student-dashboard`)

_Claude (lead), 2026-11-02. UI only. The data is ready on `main` (migration 9 + `getLearningStats()`)._

Chirag liked four reference dashboards: big ring stat cards, a weekly hours chart, a streak calendar,
a friendly greeting with a mascot bubble, and a clear "Continue" card. Build **that feel** on `/browse`,
using **only real data**. Read `AGENTS.md` first. Mobile first: 320, 375 and 430 px.

## Data you get (server component)
```js
import { getLearningStats, getCourse } from "@/lib/data";
const stats = await getLearningStats(); // null if it fails: show the page without the analytics cards
```
`stats` = `{ xp, streak, best_streak, minutes_total, minutes_this_week, minutes_last_week,
week: [{ day: "2026-11-02", minutes }] (7 items, oldest first, last = today),
active_days: ["2026-10-30", ...] (last 6 weeks), lessons_done, quizzes_passed, checks_answered, checks_correct }`.
`getCourse()` already gives modules, lessons, `progress`, `lessonCount`. Preview mode returns sample stats.
**Do not** call Supabase directly for these numbers and **do not** keep the old `getStudentStats()` on this page.

## Layout (top to bottom on phones; two columns from `xl`)
1. **Greeting row:** "Hi {first name}!" + small speech bubble: streak > 0 → "You're on a {n}-day streak. Keep it going today!";
   streak 0 → "Watch one lesson today to start a streak." Use the existing `Logo` mark or a lucide icon, **no new images**.
2. **Four ring stat cards** (use `Ring` from `ui.js`, 2×2 on phones, 4 in a row on `xl`):
   - Course: `{course.progress}%`, label "Course done", sub "{lessons done} of {lessonCount} lessons".
   - Streak: `{streak}` days, sub "Best: {best_streak}". Ring = streak / 7 (cap 100%).
   - This week: `{minutes_this_week}` min, sub "▲/▼ vs last week" from `minutes_last_week` (hide arrow if last week is 0).
   - XP: `{xp}`, sub "Quick checks right: {checks_correct}/{checks_answered}" (hide when 0 answered).
3. **Continue card:** keep `ContinueHero` (it already picks the right module); make the button full width on phones.
4. **"Minutes this week" chart:** `LineChart` (or `Bars`) from `ui.js` with `stats.week`, labels Mon…Sun from each `day`
   (format in `Asia/Kolkata`). Max = largest value, at least 30. Empty week → friendly empty state, not a flat chart.
5. **Streak calendar:** last 5 weeks as a 7-column grid (Mon first). Filled dot = date in `active_days`; today ringed.
   Day cells ≥ 40 px, numbers only, `aria-label="2 Nov: learned"` / "no learning". Legend: "Learned" / "Today".
6. Keep the existing free-plan banner, `PremiereCard` and "Your journey" module row below.

## Do NOT build (and why)
- **Leaderboards / ranks / other students' names or photos.** Students are minors: never show one child's data to another.
- **Premium/upsell cards with prices**, "Go Premium". Use the existing `/unlock` banner only.
- **AI assistant / chat box, search bar, notifications bell, course marketplace, ratings.** They don't exist; no "coming soon" clutter on the home screen.
- **Made-up numbers** (hours from old data, "performance points", ranks). If a number isn't in `stats`/`course`, it doesn't go on screen.
- New dependencies, images, fonts or colours outside the existing tokens (`primary`, `success`, `warning`, `danger`, `muted`).

## Done when
- `npm run lint`, `npm test`, `npm run build` pass; `npm run test:e2e` still passes (no small/covered tap targets, no sideways scroll at 320 px).
- Works in dark mode. Screenshots at 375 px and 1280 px, light and dark, in the PR.
- Copy is short and friendly for 13–15 year olds. PR ends with "Ready for Claude's review."
