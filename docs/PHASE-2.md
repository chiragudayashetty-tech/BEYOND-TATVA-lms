# Phase 2: what's done, what's left, who builds it

_Claude (lead), 2026-11-02._ **Next Codex batch: `docs/CODEX-SPRINT-1.md`.** Codex builds UI only; anything that needs a table, an API route, auth or RLS goes
to Claude first (AGENTS.md). Codex prompt: bottom of this file.

## Launch checklist (status)
| Item | Status | Left to do | Owner |
|---|---|---|---|
| Database permissions and RLS | **Mostly done.** H1, H2, H3 live; M2 + M3 built (PR `checked progress`). RLS on every table. | L1 upload path rule; L6 indexes | Claude |
| Student sign-in | **Done in code**, SQL-tested (onboarding, consent, one login per child). | One real test on a phone: Google sign-in → "I'm a parent" → course. Automated browser smoke tests. | Chirag (manual), Codex (tests) |
| Course access rules | **Done**, SQL-tested (free Module 0, release dates, paid, teacher, keys). | Browser smoke tests for locked vs unlocked. | Codex |
| Assignment uploads | **Works**, SQL-tested (private bucket, own folder). | L1 tighter path rule. Codex: file type/size message on phones. | Claude, Codex |
| Payments and enrollments | **LMS side done** and tested (verified match, Studio approval, refunds). | Website doesn't call the LMS yet: `docs/CODEX-PHASE-2.md`. | Codex (website) |
| Mobile bugs | **PR 20 done** (tap speed, 44px, overlays). | Real-phone pass; planner day cells are 40px wide at 375px. | Chirag (manual), Codex |
| Backups and recovery | **Nightly encrypted backup built** (`docs/BACKUPS.md`), restore tested locally. | Chirag: add 2 GitHub secrets, run once; first restore drill. Supabase Pro before scale. | Chirag, Claude |

## Phase 2: business operations (status)
| Feature | Today | Needs a database change? | Build order |
|---|---|---|---|
| Website → LMS integration | Leads API live; payment → LMS not wired | No (API exists) | 1. Codex (website): `docs/CODEX-PHASE-2.md` |
| Payment reconciliation | **Done** (`/admin/reconcile`, PR 27 + review fixes 28) | No | done |
| Business analytics | Studio home has counts; Pipeline has stages | No for v1 | 3. Codex: analytics page from existing data |
| Parent/student CRM | Pipeline (stages 1–5, filters, CSV) | Notes/follow-ups: **yes** | 4. Claude migration (`crm_notes`), then Codex UI |
| School bulk enrollment | School keys (one per student) | CSV roster import: **yes** | 5. Claude RPC (`admin_bulk_enroll`), then Codex UI |
| Workshop registration and attendance | Nothing | **Yes** (`workshops`, `workshop_registrations`, attendance) | 6. Claude migration + API, then Codex UI |

---

## Codex prompt (copy everything below this line)

You are Codex, the builder for Beyond Tatva LMS (repo `BEYOND-TATVA-lms`). First read `AGENTS.md`,
`docs/PROJECT.md` and `docs/PHASE-2.md`. Follow the rules exactly:
- One task per branch `codex/<task>` from the latest `origin/main`; one small PR each; never commit to `main`.
- Before each PR: `npm run lint`, `npm test`, `npm run build`. Paste the results, and say what you did NOT test.
- **Hard limits:** no files in `supabase/migrations/`, no SQL against Supabase, no edits to `src/proxy.js`,
  `src/lib/supabase/*`, `src/app/api/**`, `src/app/auth/**`, `src/lib/enrollments.js`, `src/app/admin/actions.js`,
  `vercel.json`. No new paid services or dependencies. No secrets. If a task needs any of these, stop and
  describe what you need in the PR. Claude builds it.
- UI: reuse `src/components/ui.js` and the `card`, `btn-primary`, `btn-secondary`, `input`, `label` classes.
  Mobile first: test at 320, 375 and 430px; tap targets ≥ 44px; no sideways scroll.
- Copy: plain English for 13–15 year olds and parents. Never promise what doesn't work: say "coming soon".
- Students are minors: never show one student's data to another; only show phone numbers in Studio (admin).
- Next.js 16: read `node_modules/next/dist/docs/` before using an API you're unsure of.

Do these in order, one PR each:

**Task 1: `codex/website-lms-payments`** (in the `BEYOND-TATVA-web` repo). Follow `docs/CODEX-PHASE-2.md`
in this repo exactly (3 small PRs there).

**Task 2: `codex/studio-reconciliation`.** New Studio page `/admin/reconcile` (admin only, `<Shell roles={["admin"]}>`),
linked from Studio nav under Enrollments.
- Reads `purchases` (already readable by admins via RLS) for a chosen month (IST).
- Shows totals: paid, unlocked, waiting, refunded, ₹ collected (`amount_paise`), by source (website/manual).
- Lists rows that need attention: pending older than 24 h, pending with a parent-phone suggestion, manual
  entries with no amount.
- "Download CSV" for the month (do it client-side from the loaded rows; no new API route).
- Read-only: no buttons that change data (approving stays on Enrollments).

**Task 3: `codex/studio-analytics`.** New Studio page `/admin/analytics` (admin only).
From data admins can already read (`profiles`, `course_access`, `purchases`, `lesson_progress`,
`quiz_attempts`, `leads`, and the existing Pipeline helpers in `src/lib/pipeline.js`):
- Funnel for the last 7/30/90 days: leads → signed in → started Module 0 → finished Module 0 → bought,
  with conversion % between steps.
- Sign-ups by source (`?src=` / UTM) and by grade; revenue by week.
- Module completion: % of paying students who finished each module.
- Simple bars with the existing `Bars`/`LineChart` components; no chart library. Fast: one parallel fetch.

**Task 4: `codex/smoke-tests`.** Browser smoke tests with the pre-installed Playwright (no new dependency:
`require('playwright')`), run against `DEV_PREVIEW_ROLE=student npx next dev`. Add `npm run test:e2e`.
Cover at 375px: every student page loads with no sideways scroll; locked modules show the lock; the
bottom tabs work; Studio pages load for admin. Don't run it in `npm test`.

**Task 5: `codex/upload-polish`.** On the assignment hand-in screen: show allowed file types and the size
limit before choosing, a clear error for too-big files, and a progress state on phones. UI only.

**Tasks 6–8 wait for Claude's database work.** Don't start them until `docs/PHASE-2.md` says
"ready for Codex" next to them:
- 6. CRM notes and follow-ups on Pipeline rows (needs `crm_notes`).
- 7. School bulk enrollment: upload a class CSV (name, grade, parent WhatsApp) → school keys per student (needs `admin_bulk_enroll`).
- 8. Workshops: Studio creates a workshop (date, school/venue, seats), a public sign-up page, an attendance
  checklist on the day, and attendee → lead in Pipeline (needs `workshops` tables and an API route).
