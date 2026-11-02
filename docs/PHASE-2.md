# Phase 2: what's done, what's left, who builds it

_Claude (lead), 2026-11-02._ **Next Codex batch: `docs/CODEX-SPRINT-1.md`.** **Since 2026-11-02 (second change): Claude builds all SQL and backend; Codex builds UI only.
`AGENTS.md` wins over this file.** Codex prompt: bottom of this file.

## Launch checklist (status)
| Item | Status | Left to do | Owner |
|---|---|---|---|
| Database permissions and RLS | **Done.** H1, H2, H3, M1–M4, L1, L6 built; RLS on every table. | L3: Chirag adds Preview secrets (`docs/PREVIEW-SECRETS.md`) | Chirag |
| Student sign-in | **Done in code**, SQL-tested (onboarding, consent, one login per child). | One real test on a phone: Google sign-in → "I'm a parent" → course. Automated browser smoke tests. | Chirag (manual), Codex (tests) |
| Course access rules | **Done**, SQL-tested (free Module 0, release dates, paid, teacher, keys). | Browser smoke tests for locked vs unlocked. | Codex |
| Assignment uploads | **Done**, SQL-tested (private bucket; path must be own folder + a real open assignment). | Codex: file type/size message on phones. | Codex |
| Payments and enrollments | **LMS side done** and tested (verified match, Studio approval, refunds). | Website doesn't call the LMS yet: `docs/CODEX-PHASE-2.md`. | Codex (website) |
| Mobile bugs | **PR 20 done** (tap speed, 44px, overlays). | Real-phone pass; planner day cells are 40px wide at 375px. | Chirag (manual), Codex |
| Backups and recovery | **Nightly encrypted backup built** (`docs/BACKUPS.md`), restore tested locally. | Chirag: add 2 GitHub secrets, run once; first restore drill. Supabase Pro before scale. | Chirag, Claude |

## Phase 2: business operations (status)
| Feature | Today | Needs a database change? | Build order |
|---|---|---|---|
| Website → LMS integration | Leads API live; payment → LMS not wired | No (API exists) | 1. Codex (website): `docs/CODEX-PHASE-2.md` |
| Payment reconciliation | **Done** (`/admin/reconcile`, PR 27 + review fixes 28) | No | done |
| Business analytics | Studio home has counts; Pipeline has stages | No for v1 | 3. Codex: analytics page from existing data |
| Parent/student CRM | Pipeline + `crm_notes` table (live after "apply 8") | Done | 4. **Ready for Codex** (task 6 spec below) |
| School bulk enrollment | School keys (one per student) | CSV roster import: **yes** | 5. Claude (SQL) → Codex (UI), task 7 |
| Workshop registration and attendance | Nothing | **Yes** (`workshops`, `workshop_registrations`, attendance) | 6. Claude (SQL + proxy) → Codex (UI), task 8 |

---

## Codex prompt (copy everything below this line)

You are Codex, the builder for Beyond Tatva LMS (repo `BEYOND-TATVA-lms`). First read `AGENTS.md`,
`docs/PROJECT.md` and `docs/PHASE-2.md`. Follow the rules exactly:
- One task per branch `codex/<task>` from the latest `origin/main`; one small PR each; never commit to `main`.
- Before each PR: `npm run lint`, `npm test`, `npm run build`. Paste the results, and say what you did NOT test.
- **Hard limits (see `AGENTS.md`):** UI only. Don't touch `supabase/**`, `src/proxy.js`, `src/lib/supabase/*`,
  `src/app/api/**`, `src/app/auth/**`, `src/lib/enrollments.js`, `src/app/admin/actions.js`, `vercel.json`, `.github/**`.
  No SQL against Supabase. If you need backend that isn't on `main`, stop and describe it; Claude builds it.
  No new paid services or dependencies. No secrets.
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

**Tasks 7–8: Claude builds the migration/RPC/proxy part first (`claude/...`), then Codex builds the UI on top.**
- 6. **READY FOR CODEX: `codex/crm-notes`.** Table `public.crm_notes` (admins only via RLS): `id, student_id, lead_id`
  (one of them required: use the Pipeline row's `student_id`, else `lead_id`), `body` (1–1000 chars), `channel`
  (`call|whatsapp|email|visit|other`, optional), `follow_up_at` (optional), `done_at`, `created_by` (auto), `created_at`.
  Build: on `/admin/pipeline` each row gets a "Notes (n)" button that opens a panel (bottom sheet on phones) listing the
  notes newest-first, with a form to add one (body, channel, optional follow-up date/time in IST) and a "Done" tick on
  follow-ups. Read/write with the browser Supabase client (`createClient` from `@/lib/supabase/client`): RLS allows
  admins only. Add a "Follow-ups due (n)" filter to Pipeline (notes with `done_at is null and follow_up_at <= now()`),
  loaded with one extra query in the page (don't change `admin_pipeline`). Show due follow-ups on the Studio home
  as a small card with links. The `crm_notes` table and its RLS are **already live** (migration
  `20261102000006`), so this task likely needs no migration. If you do need one (e.g. an index or helper), add a
  **new** migration with tests per `AGENTS.md`; editing `src/app/admin/actions.js` is allowed with "SECURITY:" in the title.
- 7. **Claude: `claude/school-bulk-enroll-db`, then Codex: `codex/school-bulk-enroll` (UI only).** Studio → School keys: "Upload class list" (CSV: student name,
  grade 8–10, parent WhatsApp; optional section). Migration: table `school_rosters` (school_id, class name, grade,
  student_name, parent_phone normalised with `public.normalize_phone`, access_key code, redeemed_by, created_at);
  function `admin_bulk_enroll(p_school uuid, p_course text, p_label text, p_rows jsonb)` (admins only, max 200 rows,
  validates every row and returns per-row errors without inserting anything if any row is bad) that creates one
  access key per row (same code format as `create_access_keys`) and returns `{name, code}` list. When a student
  redeems a roster key, link `redeemed_by` and put them in the class (`enrollments`) for that school + grade.
  UI: preview table with row errors before saving; after saving, download CSV of name + key to print or WhatsApp.
  Tests: admin only, bad rows rejected atomically, keys work once, redeem links the roster row.
  **Backend done (migration `20261102000007_school_bulk_enroll`).** Codex UI calls
  `supabase.rpc("admin_bulk_enroll", { p_school, p_course: COURSE_ID, p_label, p_rows })` with
  `p_rows = [{ name, grade, parent_phone, section? }]` (max 200). Result: `{ ok: false, errors: [{ row, error }] }`
  (nothing saved; show errors per row, row numbers start at 1) or `{ ok: true, keys: [{ name, code, grade, class }] }`
  (offer a CSV download of name, class, code). Parse the CSV in the browser; no new dependency.
- 8. **Claude: `claude/workshops-db` (tables, RPC, proxy public path), then Codex: `codex/workshops` (public page +
  Studio UI only).** Tables: `workshops` (title, starts_at, venue, school_id null, seats, published, slug) and
  `workshop_registrations` (workshop_id, student_name, grade, parent_name, parent_phone normalised, consent_at,
  attended_at, lead_id). RLS: admins manage both; anonymous users may read **published** workshops only (no
  registrations). Public registration goes through `register_workshop(p_slug, ...)` (security definer, rate-limit
  per phone+workshop: one registration; respects seats; requires the parent-consent tick) which also inserts a
  `leads` row with source `workshop` so it shows in Pipeline. Public page `/w/[slug]` (no sign-in; add the path to
  the proxy's public list) with the form; Studio `/admin/workshops`: create/edit, registrations list, attendance
  ticks on a phone at the door, CSV export. Tests for RLS, seats, duplicate phone, consent required.
  **Backend done (migration `20261102000008_workshops`, proxy allows `/w/*`).** Codex UI:
  - Public `/w/[slug]` (works signed out): `supabase.rpc("get_workshop", { p_slug })` → `{ title, starts_at, venue,
    slug, seats_left, open }` or `null` (show "Workshop not found"). Form calls `rpc("register_workshop", { p_slug,
    p_student_name, p_grade, p_parent_name, p_parent_phone, p_consent })` → `"registered"` or `"already"`; errors
    come back as friendly messages (show `error.message`). Grades 8–10 only. Consent tick text: "I am the parent or
    guardian and agree to Beyond Tatva contacting me on WhatsApp about this workshop."
  - Studio `/admin/workshops` (admin only): plain table reads/writes on `workshops` (create/edit/publish) and
    `workshop_registrations` (list, `attended_at` tick, CSV export). RLS already limits both to admins.
