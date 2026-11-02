# Codex Sprint 1 (long task list)

_Written by Claude (lead), 2026-11-02._ Copy everything below the line into Codex. Codex works through the
tasks in order, **one branch and one PR per task**, and stops after each PR until Chirag says "next".

---

You are **Codex, the builder** for Beyond Tatva LMS (repo `BEYOND-TATVA-lms`, Next.js 16, React 19,
Tailwind 4, Supabase). Students are Grade 8–10 kids in Udupi, India; most use cheap Android phones.

## Read first, every task
`AGENTS.md`, `docs/PROJECT.md`, `docs/PHASE-2.md`. Next.js 16 differs from what you know: check
`node_modules/next/dist/docs/` before using an API you're unsure of.

## Rules (breaking one = PR rejected)
1. Branch `codex/<task>` from the latest `origin/main`. One task per PR. Never commit to `main`. Never merge.
2. Before each PR: `npm run lint`, `npm test`, `npm run build`, all green. Paste the output. Write what you
   changed, why, how you tested it, and **what you did not test**.
3. **Database and security files (rule changed 2026-11-02, `AGENTS.md` wins):** you MAY add **new**
   migrations in `supabase/migrations/` with tests in `supabase/tests/studio_test.sql` (`npm run test:db` green);
   never edit an existing migration; never run SQL against Supabase. You MAY edit `src/proxy.js`,
   `src/lib/supabase/*`, `src/app/api/**`, `src/app/auth/**`, `src/lib/enrollments.js`, `src/app/admin/actions.js`,
   `vercel.json`, `.github/**`, but the PR title must start with "SECURITY:".
4. No new dependencies or paid services. No secrets, no `.env*` files.
5. UI: reuse `src/components/ui.js` (Card, Badge, StatCard, Empty, PageTitle, Progress, Bars, LineChart,
   Avatar, IconTile) and the classes `card`, `btn-primary`, `btn-secondary`, `btn-ghost`, `input`, `label`.
   **Mobile first:** check 320, 375 and 430px wide. Tap targets ≥ 44px. No sideways scroll. Inputs keep
   16px text on phones. Dark mode must look right.
6. Copy: plain, friendly English for 13–15 year olds and their parents. Never promise something that
   doesn't work. Write "coming soon" instead.
7. Privacy: students are minors. Never show one student's data to another. Phone numbers and emails
   appear only on Studio (admin) pages.
8. Data on Studio pages: read with the server Supabase client (`createClient` from
   `@/lib/supabase/server`) inside the page; RLS already limits admin-only tables. Wrap pages in
   `<Shell roles={["admin"]}>` (Studio) or the right roles.
9. Keep PRs small (under ~400 changed lines). Split a task if it grows.

## Tasks (in order)

### 1. `codex/studio-analytics`: business analytics page
New page `/admin/analytics`, linked in the Studio nav (`src/lib/nav.js`, admin `main`, after Pipeline,
icon `ChartLine`). Range picker: 7 / 30 / 90 days (search param `?days=`), IST dates.
- **Funnel** (counts + % step to step): leads (`leads`) → signed up (`profiles` role student) → started
  Module 0 (any `lesson_progress` row on a Module 0 lesson) → finished Module 0 (all Module 0 lessons
  `completed_at`) → bought (`course_access`). Reuse helpers in `src/lib/pipeline.js` where they fit.
- **Sign-ups by source** (`profiles.signup_source`, `profiles.signup_utm`) and **by grade**.
- **Revenue by week** from `purchases.amount_paise` (status ≠ `revoked`), shown in ₹.
- **Module completion:** for paying students, % who finished each module.
- **Quiz health:** per quiz, attempts, pass rate, average score (`quiz_attempts`).
- One `Promise.all` for all reads; no client-side fetching. Use `Bars` / `LineChart`; no chart library.
- Empty states for every card ("No data yet").
- Test: add `tests/analytics.test.mjs` for any pure helper you write (funnel %, week bucketing in IST).

### 2. `codex/profile-edit`: make "Edit profile" work
On `/profile`, "Edit profile" opens an inline form: display name and avatar colour/initial only.
- **Stop-and-ask:** saving needs a database function (students can't update `profiles` directly). Build the
  form and its validation (name 2–60 chars, letters/spaces/.'-), wire it to call
  `createClient().rpc("update_my_profile", { p_full_name, p_avatar })`, and in the PR ask Claude to add
  that function. Until then show "Saving profiles is coming soon" and disable the Save button
  behind a constant `PROFILE_EDIT_READY = false`.

### 3. `codex/help-page`: Help and support
New page `/help` (all signed-in roles) linked from Profile → "Help and support".
- FAQ (accordion with `<details>`): signing in (Google / "the course opens only with the login you
  bought with"), Module 0 is free, how unlocking works (website payment, school key, parent-phone
  payments are checked by us), videos not playing (switch to Chrome, check data), quizzes (answers show
  after a pass or the 3rd try), assignments (file types and size), installing the app on the phone.
- WhatsApp button: `https://wa.me/<number>` from `process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP`; hide the
  button if it isn't set (say in the PR that Chirag must set it in Vercel).
- Short "Privacy" section: what we store (name, grade, school, parent WhatsApp), that we never sell it, and
  "to delete your data, message us" (Studio delete comes later).

### 4. `codex/loading-skeletons`: skeletons for the remaining pages
Add `loading.js` matching each page's layout for: `/browse`, `/dashboard`, `/progress`, `/planner`,
`/assignments`, `/quiz/[id]`, `/teacher`, `/profile`, `/admin/pipeline`, `/admin/reconcile`. Pattern:
`src/app/course/loading.js`. Must include `role="status"` and an `sr-only` label.

### 5. `codex/upload-polish`: assignment hand-in on phones
On the assignment hand-in screen: show allowed types (images, PDF) and the size limit **before** picking;
a clear error for a too-big or wrong-type file **before** upload; a progress/"Uploading…" state; a retry
button on failure; previews for images. Check the current limits in the existing upload code and keep
them (don't change storage rules).

### 6. `codex/smoke-tests`: browser smoke tests
Add `tests/e2e/smoke.mjs` using the **pre-installed** Playwright (`require('playwright')`; do NOT add it to
package.json or run `playwright install`) and a script `npm run test:e2e` that starts
`DEV_PREVIEW_ROLE=student npx next dev -p 3100`, waits for it, runs the checks and stops it. Not part of `npm test`.
Checks at 375px (and 320px for the student pages):
- every student page (`/browse`, `/course`, `/dashboard`, `/progress`, `/planner`, `/certificates`, `/profile`,
  `/search`, `/unlock`, `/assignments`) returns 200, has no sideways scroll, no console errors;
- every visible button/link is ≥ 44×44 px (allow inline text links) and isn't covered by another element
  (use `document.elementFromPoint` at its centre); ignore the dev-only preview switcher and Next dev overlay;
- with cookie `preview_access=0`, paid modules show a lock; with `1`, they don't;
- with cookie `preview_role=admin`, every Studio page in the nav loads.
Print a short table; exit non-zero on any failure.

### 7. `codex/a11y-pass`: accessibility pass
Fix what you find, smallest changes possible: every icon-only button has `aria-label`; form inputs have
labels; colour contrast of `text-subtle` on `bg-surface` meets 4.5:1 for body text (adjust the token in
`globals.css` for both themes if needed); focus rings visible on keyboard focus; the quiz options work
with arrow keys (they use `role="radio"`); modals (onboarding teacher terms) trap focus and close on Esc.

### 8. `codex/planner-cells`: planner calendar tap size
`/planner` month and week cells are ~40px wide at 375px. Make taps reliable without breaking the 7-column
grid: larger hit area via padding/`::before`, or make the week strip horizontally scrollable with
snap; keep it readable at 320px.

### Waiting for Claude (don't start)
CRM notes on Pipeline rows, school bulk roster import, workshops, Studio delete/export of a student's data.
They start when `docs/PHASE-2.md` marks them "ready for Codex".

## After each PR
Stop. Write in the PR: "Ready for Claude's review." Claude reviews; Chirag merges; then continue.
