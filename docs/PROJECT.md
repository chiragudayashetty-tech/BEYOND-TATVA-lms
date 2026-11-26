# Beyond Tatva LMS: project status

_Maintained by Claude (lead). Last updated: 2026-11-15. If this file and the code disagree, the code on `main` wins: tell Claude._

AI course for Grades 8–10 in Udupi. **Payments happen only in this LMS** (Razorpay on `/unlock`, live). The website
(beyondtatva.in, separate repo `BEYOND-TATVA-web`) markets and sends people here; it takes no money. Students sign in, watch weekly modules, take quizzes and
hand in assignments. Chirag runs everything from **Studio** (`/admin`).

## Live
- App: https://learn.beyondtatva.in (also https://beyond-tatva-lms.vercel.app; Vercel project `beyond-tatva-lms`, region **bom1** Mumbai)
- Database/auth: Supabase project `fpubcjcqpsjnafnmkkzo` (ap-south-1 Mumbai)
- Studio admins: `studio_admins` table (exact emails or `@beyondtatva.in`), edited only in the Supabase dashboard.

## Built and live
| Area | Notes |
|---|---|
| Login | (2026-11-14, branch `claude/festive-wright-wtxgmd`) Google; **email + mobile + password, no code**: sign-up asks for both (both stored on the Supabase user), sign-in with **either** + password (`signInWithPassword` with `email` or `phone`); email code as a fallback. `/api/auth/signup` creates the account (service role), refuses Studio/`@beyondtatva.in` addresses, 5 per IP per hour / 20 per day (`20261114000003`, applied 2026-11-14). Accounts are flagged `password_unverified`: the first Google / email-code / reset-link sign-in replaces that password (anti-squatting, `src/lib/password-accounts.js`). Forgot password is **automatic by email**: type the email or the mobile → `/api/auth/forgot` (mobile → account email via `email_for_phone`, 1/min 5/hour per number) emails a reset link → Profile → Password. **Needs Chirag: Resend SMTP + "Reset password" template (docs/login-setup.md step 5).** Backup: Studio → People → **New password** (temporary). Profile → Password sets/changes it. **Sign-in by mobile needs Supabase → Auth → Providers → Phone switched on** (Chirag; see docs/login-setup.md). WhatsApp codes come once Meta verification is done (DLT is SMS only). |
| Onboarding | One login per child: the student or a parent sets up the student account (parent WhatsApp required, child phone optional, consent tick). Teachers: teacher code. No parent accounts or codes. |
| Course | 1 course, Module 0 free (one fixed date) + paid modules, access via key/payment/admin. |
| Weekly batches | (2026-11-09) A student's batch = first Sunday 10:00 IST after they got course access; everyone before 15 Nov 2026 is Batch 1. Each paid module has a week (1–5) and opens on that batch Sunday. Batch 1 order: modules 1, 3, 2, 4, 5. Studio → Content shows each module's week and Batch 1 unlock date. | **School batches (2026-11-26, `20261126000002`, applied):** `schools.batch_start` set → every student of that school follows the school schedule whenever they joined (Module 1 at batch_start, then weekly by `batch_week`, no Batch 1 reorder); late joiners get what is already out. SVVN = Sun 29 Nov 2026 10:00 IST. Set by Claude via SQL; no Studio field yet. || Video | YouTube (tracked, with fallback), Drive/Vimeo/Bunny embeds, MP4. **Watched = 10-second parts really played** (2026-11-15, `20261115000002`, applied): the player sends played parts (`src/lib/watch.js`, a seek marks nothing), `save_progress(p_seen)` keeps them in `lesson_progress.seen`, caps new parts to real time, uses the player's real length (`video_seconds`), stores `watched_pct`; **complete at 90% of parts**. **Hardened 2026-11-15 (`20261115000008`, was `000006`, renumbered to avoid a clash; applied 2026-11-15 after "apply", live as `watch_tracking_hardening`):** a save with no parts only moves the resume position (no %, no completion); the first video length must be ≥ half of Content minutes and can't later shrink >10%; time since the last save counts max 60 s (≤15 new parts per save), so offline catch-up is credited slowly. Offline Downloads send parts too. Bunny progress is tracked for real (saved every 15 s) and lessons resume where the student stopped (2026-11-08). Full screen turns the phone to landscape; iPhone falls back to native video full screen (2026-11-09). |
| Analytics v2 | **Learning score (2026-11-15):** lessons by average % watched 50, quizzes 25, checkpoints 10, assignments 10, resources 5; parts the course lacks are left out; **active days no longer count**. Student scorecards, school roll-up (real school from linked workshop leads, Module 0 starts = Module 0 lessons only), PDF view tracking, honest scores from real progress (2026-11-08). |
| Weekly batches | The course runs 5 weeks, one module a week, Sunday 10:00 IST. A student's batch starts on the first Sunday after the day they got course access (`course_access.granted_at`); access before Sun 15 Nov 2026 = Batch 1 (`courses.batch1_start`). Each paid module has `batch_week` (1–5); `batch1_week` overrides it for Batch 1 (order 1, 3, 2, 4, 5: Module 3 on 22 Nov, Module 2 on 29 Nov). A module opens at the student's batch start + (week − 1) × 7 days, never before `chapters.release_at` ("content ready from"; 2099 = Coming soon). Module 0 keeps one date. Server-enforced: `chapter_release_for`, `can_open_chapter`, `can_watch_lesson`; the app reads `my_module_releases`; Studio → Content shows week + Batch 1 date and has the two week fields; `admin_student_batches` lists each student's batch. Locked modules show their thumbnail and the student's own Sunday date. | **Unlock all (2026-11-22, `20261122000001`, not applied yet):** `course_access.unlock_all = true` skips the batch schedule for one account (presenters, guests); Coming soon modules stay closed. Set by Claude via SQL after Chirag asks; no Studio button yet.
| Images and icons | Module thumbnails are 1280×720 JPG in `public/media/modules/` (all six, 2026-11-12). Course page banner `public/media/course-banner.jpg` (1600×1000; becomes the poster if a hero video is set). Link preview `public/media/og-image.jpg` (1200×630, OG + Twitter tags in `layout.js`). App icons and favicon are the dark Beyond Tatva icon (LMS and website). |
| Duplicate accounts | Duplicate student logins are marked so analytics count each child once; Studio duplicate review merges into a main account, with undo (2026-11-08). |
| Signup school list | Sign-up offers a list of schools (2026-11-08). |
| Studio | Content, Quizzes, Assignments (marking queue), Enrollments, Access keys, People. |
| Quizzes | One per module, server-side marking, answers never sent to the browser. |
| Assignments | Text, link, photos/PDF (private bucket); mark, feedback, send back. |
| Website → LMS | `POST /api/leads` (signed) carries website leads. `POST /api/enrollments` exists but isn't needed while all payment happens on `/unlock`. |
| CRM notes | Pipeline "Notes (n)" per person, follow-ups due filter, due card on Studio home. |
| School bulk enrollment | Studio → School keys → Upload class list (CSV, max 200): one key per child, classes by grade + section; redeeming joins the class. |
| School outreach | Studio → School outreach (`/admin/outreach`): add schools, **Workshop status** (Not contacted, Called, Meeting, Date requested, Visited, Workshop confirmed, Workshop done, On hold, Later, Referral, Dropped) + **After-workshop status** (Following up, Partner, Closed) — the same words as the sheet (2026-11-14, `20261114000004`, applied); contact, log calls/visits (dated history), next step + date, due/overdue filter. Today shows open schools (not Dropped / Closed / Partner) due within a week, or at Meeting / Date requested / Workshop confirmed / Following up. Main record for outreach; the School Outreach sheet mirrors it every 5 min. **Sheet was stuck 8–14 Nov** (no hidden Version column → every edit "stale", pull quit silently); fixed 2026-11-14: sheet imported into the LMS once, script adds missing ID/Version columns itself, one sync at a time (document lock), cell A1 shows ✅ / red ❌ with the reason. Public `/w/<slug>` workshop sign-up **removed 2026-11-09**. |
| Student dashboard | Course / XP + rank / quick-check rings; XP leaderboard (first name + initial, **shown by default**, opt-out in Profile; dashboard = everyone, `/leaderboard` has **My batch / Everyone** tabs — `20261116000004` (file renamed from `20261116000003`; live under version `20261116000003_leaderboard_visible_and_batches`, applied 2026-11-20 — do not apply again)); XP rules: see "Learning rules" below. No streaks (Chirag). |
| Studio analytics | **Rebuilt 2026-11-15:** sign-ups / bought / revenue, Student journey funnel, **Module watching** (started, average % watched, finished, drop-off bars per tenth of the video), **Needs a nudge** (no learning 7+ days or never started, % per module), Schools at a glance. Removed: Module 0 quiz health, by-grade charts, revenue by week, sign-up-to-purchase time, Lead matching, active days. Student page: plain counts ("45% watched", "1 of 2 passed · average 36%") + sheet columns; students table shows Watched %. Insights: active students, paid-but-stopped 14+ d, lesson drop-off, sources that pay, refunds, schools, workshop funnel. Daily watch log (`learning_days`) since 2026-11-02. |
| Test accounts | `profiles.is_test` (Studio → student: mark test / give test access via `admin_set_test`, `admin_set_test_paid`; students who signed up before 20 Nov were auto-marked). **2026-11-25 (`20261125000002`, not applied yet):** Analytics, Pipeline, Insights and Studio home counts skip test accounts, so free test access no longer counts as "bought". Kitty test and Chirag (22 Nov) marked test on live 2026-11-25. Real state 2026-11-25: 1 paid student (Poorvi Hegde, SRVK); SRVK = ~38 leads → 1 paid; Dinesh Fish and rithwik Poojary are real students. **2026-11-26 (`20261126000003`, not applied yet):** Pipeline has a **Test accounts** tab (Test badge, "Mark as test" / "Not a test" button on each signed-in row); test rows stay out of Open/Closed, stage cards and CSV export. No automatic test marking any more: every new login is a real student; test accounts are marked by hand only. |
| Class races | Any school, after a workshop: Studio → **Class races** (`/admin/races`) picks a school, start (default now, IST) and length (24 h / 48 h / 3 days / 1 week); starting again replaces it; **End now** keeps the final result 3 days. Students of that school see a quiet race card on Course (school name, live countdown, thin track lines; 2026-11-25 redesign): top 3 classes for Module 0 watched and for enrolments (names only, never counts), their own class marked "You", section picker. Test and duplicate accounts don't count. **By class only:** `school_races.by_section = false` ignores sections ("Class 8" vs "Class 9") and hides the section picker; SVVN set so 2026-11-26 (`20261126000001`, applied). (`20261125000003`, applied 2026-11-25; SVVN race from `20261125000001` stays.) |
| Payments (how it works now) | **One place to pay: LMS `/unlock`.** Every website Enroll button → LMS sign-in → `/unlock` (new Google sign-ins can pay before onboarding). Razorpay: `POST /api/create-order` (price from DB, coupon via `coupon_price`) → modal → `POST /api/verify-payment` (HMAC + order belongs to this student) → `record_purchase` + `claim_purchases`. Second option: **Pay via WhatsApp**: Chirag confirms the payment and sends an **access key**, which the student redeems in the key box on `/unlock`. `RAZORPAY_KEY_ID`/`SECRET` and `NEXT_PUBLIC_SUPPORT_WHATSAPP` are set in Vercel (Production + Preview, 2026-11-04). **Live keys; KYC done; real ₹ payment tested end to end by Chirag 2026-11-09** (after paying, `/unlock` now does a full page load to `/course`; before, the cached pay page stayed until a tab switch). The website's own Razorpay checkout (`/api` in BEYOND-TATVA-web) is no longer the main path. |
| Google Sheets sync | Two spreadsheets, never copies. **Workshop leads**: one tab per source: a tab per school workshop (auto-created when outreach status = "Workshop done" or a lead arrives), "Website" (website + Loki chat), "Manual"; all ↔ `leads` (`leads.tab` / `lead_tab()`). **School Outreach**: one row per school ↔ `outreach_schools`; **the LMS is the main record** (since 2026-11-08): every pull rewrites the tab from the LMS (adds, updates, removes schools deleted in Studio); sheet edits push only if the row's hidden **Version** (= `updated_at` at last pull) is still current, else skipped as `stale` and refreshed; Calls / Visits / History are LMS-only (Studio "Log call / Log visit"); a sheet row edited after its school was deleted in Studio is not re-created. `scripts/sheets-sync.gs` pushes edits (`POST /api/sheets`) and pulls every 5 min (`GET /api/sheets`, header `x-sheets-key` = `SHEETS_SYNC_SECRET`). Rows match by hidden **ID**; same phone + same/no child name is merged automatically (`sheet_merge_duplicates`), siblings kept and noted; "LMS email" links a lead to an account. LMS owns **Source / Signed up / Module 0 / Paid?**. |
| Login (WhatsApp, 2026-11-16) | **Main sign-in = WhatsApp code + Google**, live and tested by Chirag. Mobile → 6-digit code via Supabase Send SMS hook → `/api/auth/send-otp` → AiSensy API campaign `login_otp1` (Authentication template; env `AISENSY_OTP_CAMPAIGN`, `NEXT_PUBLIC_PHONE_LOGIN=1`). New numbers create an account, are asked for an email (confirmation link, skippable) then onboarding; onboarded numbers go straight in. Email/password sign-in and email sign-up stay below. Changing an env value needs a Vercel redeploy. |
| WhatsApp automations (AiSensy) | (2026-11-16, `20261116000001`, **not applied yet**) Studio → Automations. Rules: new lead welcome, "payment link" Next step, payment received, new student welcome (parent WhatsApp); each off until an AiSensy API campaign name is set. DB triggers fill `message_queue` (do-not-contact skipped, dedupe per event, >3 days never sent, archived v2 sheet never sends). Sender `/api/automations/run` (x-sheets-key) is started by the Leads Tracker script every 5 min, sends 9am–9pm IST, 3 attempts; results go to the sheet's **Automations** tab and Studio. Needs Chirag: `AISENSY_API_KEY` in Vercel, approved templates + API campaigns in AiSensy, re-paste `scripts/leads-tracker-sync.gs`. |
| Studio → WhatsApp (2026-11-16) | Rebuilt `/admin/automations` (nav: **WhatsApp**) in plain words, tabs **Messages** (link an AiSensy API campaign + what fills each blank; text lives in AiSensy) / **Auto-send** ("When … → send [message] On/Off") / **History** (Sent, Failed, Opted out, Waiting, Not sent; Retry). **Opt-in/opt-out card**: can message / do not contact / said STOP. No AiSensy webhooks on Basic, so delivered/read/replies stay in AiSensy; an AiSensy opt-out refusal marks the lead Do not contact (`20261116000003_whatsapp_optouts`, applied). |
| WhatsApp CRM (AiSensy) | (2026-11-16, `20261116000002`, **not applied yet**) Studio → Automations → **WhatsApp templates** (one per AiSensy API campaign: Kannada/English, marketing/utility, variables from placeholders {parent_name} {student_name} {student_first} {school} {grade} {stage}, optional photo/video header). Send any template from **Pipeline** ("WhatsApp these N" = current filter, max 500, do-not-contact left out) or a **lead page** (with that lead's WhatsApp history). Phones/names resolved in SQL (`admin_send_template`), one send per template per person per day. Every message carries AiSensy **tags** (school, stage, lms) + **attributes** (student, school, grade, stage), so AiSensy contacts mirror the LMS. Rules can use a template. |
| School Leads Tracker sync | (2026-11-14, `20261114000006` applied 2026-11-14) New sheet "Beyond Tatva - School Leads Tracker": one **Leads** tab for every school. `scripts/leads-tracker-sync.gs` ↔ `/api/sheets/leads` (separate from `/api/sheets`). Columns by header name; Next step = status, Short note = Studio next step; Section, Parent name, Source stored; other columns in `leads.sheet`. **Incremental:** every 5 min only leads changed since the last pull (`tracker_snapshot(since)`); full pull hourly removes Studio-deleted rows (safety net) and writes the School list (School outreach, not Dropped/Referral) into Options A. `leads.book`: 'v2' = old archived sheet, 'tracker' = everything new; `/api/sheets` no longer sends tracker leads to the old sheet. `sheet_sync_health` + red banner on Studio → Today after 30 min without a pull. Manual: `docs/SHEETS-SYSTEM.md`. |
| Lead write-back | `leads.updated_source` ('sheet'/'studio'). A Studio → Today log sets 'studio'; the next pull (5 min) writes only the differing cells back into the Workshop leads sheet: Status / Next step / Next date / Do not contact. A sheet edit pushes with `touched` = the edited fields: for a 'studio' lead only those are taken (a stale row can't wipe a Studio log) and the lead flips to 'sheet' once the sheet has caught up. Last write wins. LMS-owned lead columns are now written cell by cell (formulas elsewhere survive). Schools follow the School outreach rules above (LMS is the main record). |
| Studio → Today | `/admin/today` (first nav item, mobile tab): counts (schools/leads due today or overdue, paid this week), schools to follow up (next date ≤ 7 days or Meeting set / Workshop booked, not Not interested), leads to follow up (from `sheet_snapshot` via the service-role client after an admin check: not paid, not do-not-contact, due ≤ 7 days or status empty / "interested" / "call", not "not interested"), grouped by tab. Call, WhatsApp (prefilled greeting) and Log: schools → `logOutreach` (WhatsApp counts as a call) + status/next step/date; leads → `admin_log_lead_contact` (CRM note, follow-up 10:00 IST). |
| Payment safety net | `POST /api/razorpay-webhook` (2026-11-09): Razorpay tells us about every captured payment even if the browser closed; records the purchase for the student in the order notes, safe to receive twice. **Needs Chirag:** Razorpay → Settings → Webhooks (URL `https://learn.beyondtatva.in/api/razorpay-webhook`, events `payment.captured`, `order.paid`) and the same secret as `RAZORPAY_WEBHOOK_SECRET` in Vercel. |
| Limits (2026-11-09) | Uploads: 10 MB + photo/PDF only (bucket), max **15 files per assignment, 60 per student** (DB rule); files a student removes are deleted on save. WhatsApp login codes: 1/min, 5/hour per phone. Studio Assignments/Enrollments show "Show more" when a list hits its limit. |
| Load test | `scripts/load-test.mjs`: N test accounts sign in and open dashboard/course/lesson at once, prints p50/p95/p99. Preview only (refuses production). Not run yet. |
| Removed 2026-11-09 | Workshop sign-up page `/w/<slug>` and Studio's UPI-screenshot card (0 claims ever). |
| Removed 2026-11-14 | Whole workshop registration system: tables `workshops` + `workshop_registrations`, `get_workshop`, `register_workshop`, `admin_register_leads`, Insights `workshops` block, Analytics "Workshop attendees to follow up" (migration `20261114000002_remove_workshops`). |
| Next step + phone pass (2026-11-10, on branch `claude/eloquent-carson-kh7eqx`, not merged yet) | One "next step" everywhere (`nextStep()` in `src/lib/catalog.js`): half-watched lesson → next lesson → module quiz → assignment → unlock → wait → certificate. Shown on the dashboard hero, top of the course page and after a lesson ("Lesson complete" + one button). Each open module has one big Start / Continue / Take the quiz button. Dashboard lost its duplicate "Start here" and "Continue watching" cards. Paid students no longer see "Unlock for ₹" on a module that hasn't opened yet. Studio sidebar grouped (Teach / Students and payments / Grow); Studio home links every section (Reconciliation, School keys, Analytics were unreachable on a phone). Tap targets ≥ 44 px and no sideways scroll on Studio home, Content, Teacher. Security headers on every response (`next.config.mjs`): no framing, nosniff, referrer policy, HSTS. Smoke suite: 35 pass; the 2 `/course` failures are only the test sandbox blocking the hero video. |
| Learning rules (2026-11-12; `20261112000001_quiz_two_tries_xp_rules` applied 2026-11-13) | **XP:** 10 per right quiz answer on the average of the student's tries; 100 per fully watched module; up to 50 per marked assignment (by marks); 10 per right quick check. The per-quiz XP number is no longer used. **2 tries per quiz**; answers show after a pass or the 2nd try. Rules live in one place for screens (`QUIZ_TRIES`, `XP_RULES` in `src/lib/catalog.js`) and in `student_xp` / `submit_quiz` in the database. **Studio → Quizzes → Review results** (`/admin/quizzes/<id>`): every student's tries and picked answers, % right per question, most common mistake, "Give tries back" (`admin_reset_quiz_attempts`). Scorecard quiz part = average of tries (was best try). |
| Offline downloads (2026-11-13, merged in #140; off until the Bunny steps are done) | "Download for offline" on each open module and lesson; `/downloads` page; saved inside the app, resumable, plays without internet, offline watch time syncs later. **Not live until Chirag does the 4 Bunny/Vercel steps in `docs/OFFLINE-DOWNLOADS.md`** (MP4 fallback, `BUNNY_CDN_HOST`, CORS). No database change. |
| Coupons | Studio → Enrollments → Coupons (code + price + time window). Applied on `/unlock`, priced on the server via `coupon_price`. |
| Module attachments | Studio → Content → module → Attachments (PDF/images ≤ 25 MB); students View/Download/Download all on open modules. |
| Tests | `npm test`, `npm run test:db`, `npm run test:e2e` (Playwright smoke; 2 checks parked as TODO). |
| Pipeline | Studio → Pipeline: one row per student (siblings separate since 2026-11-14), stages 1–5 (lead → bought), "stopped >24h", Follow-ups due, CSV export (same filters), Parents / School enquiries tabs. **Filters (2026-11-14, `20261114000005`, applied 2026-11-14):** School, Class, Section, Status (open / won / lost / do not contact, one rule `lead_outcome()` = `src/lib/crm.js`), Source, Siblings only, Due today/overdue, search; **Group by school** (cards: leads, open, won, lost, conversion %) and, inside a school, a Class → Section table. Filters live in the URL. Leads matched to students by account, else parent phone. Today: school filter, leads grouped by school, won/lost never shown. **2026-11-15:** Open / Closed tabs (closed = won, lost, do not contact), list grouped by school → sheet status. **Delete = 30-day trash** (`20261115000001`, applied): delete / clear / remove-duplicates move leads + notes to `leads_trash`; Pipeline → **Trash** restores; Duplicates → **Keep this, merge others** (`admin_merge_leads`: fills empty fields, combines sheet columns, moves notes, trashes the other). **Click any name** in Studio (`src/app/admin/PersonLink.js`) → student page, or the lead page `/admin/pipeline/lead/<id>` (lead + filled sheet columns + notes). School outreach: each school shows its lead numbers (links to Pipeline) and an after-workshop status filter. |

## Security hardening (2026-11-14, migration 20261114000001, applied 2026-11-15 after "apply")
**Applied 2026-11-15 after Chirag's "apply all" (recorded live under their file names):** `20261114000001_security_hardening`, `20261114000002_remove_workshops` and `20261114000007_leaderboard_full_list` (was `000001`, renumbered: two files shared that version). Before this the live app called `set_leaderboard_hidden` and read `consent_texts`, which did not exist. Workshop tables dropped (1 workshop, 0 registrations). All current students without parent confirmation are now hidden from the leaderboard until they switch it on. Open: Supabase Auth "leaked password protection" is off (dashboard setting).
Live once applied: consent wording versions + consent records, leaderboard off by default, workshop system removed (`20261114000002`),
cross-student tests for guardians / sessions / purchases / lesson_media.

**Postponed by Chirag, built but switched off (turn on when needed):**
- Admin MFA: `/mfa` screen is built. To turn on: enable TOTP in Supabase, every admin enrols at `/mfa`, set
  `REQUIRE_ADMIN_MFA=1` in Vercel, then Claude adds the `aal2` check to `is_admin()` (new migration).
- Video lock: set `BUNNY_EMBED_TOKEN_KEY` in Vercel, redeploy, then turn on Bunny embed token auth + allowed domain.
  Until then paid video links can be copied and shared.
- Parent WhatsApp confirmation: built (`/api/parent-consent`, Profile card hidden until `WHATSAPP_TOKEN` is set).
  When WhatsApp is connected, Claude adds "parent confirmed" as a requirement to join the leaderboard.

## Removed features (don't rebuild without Chirag asking)
- **Workshop registrations** (removed 2026-11-14). Parents booking a child into a Beyond Tatva workshop via a public
  link, seats, attendance, attendee follow-up. Gone from database, Studio and analytics.
  **Still here on purpose, don't remove:** school outreach statuses "Workshop booked" / "Workshop done" (school sales
  pipeline, Sheets tab creation, Today page), old leads with source `workshop` (shown as "Workshop form (old)"),
  coupon codes named like WORKSHOP499 (just names). In-school workshops are a *sales activity*, tracked in School
  outreach and Pipeline, not a product feature.
- **UPI-screenshot payments card** (removed 2026-11-09).

## Decisions (don't reopen without Chirag)
- **Website and LMS are completely separate.** The website (www.beyondtatva.in) is the front door for
  everyone: marketing, posts, selling, enrolling. The LMS (learn.beyondtatva.in) is only for
  enrolled students and people who choose "Try Module 0 free". No automatic redirects between them,
  only links the owner places (website: "Log in" / "Start free"; LMS: "Get the full course").
- **The login is the key** for individual buyers. **School deals use student keys** (2026-11-02): Studio → School keys makes one key per student, redeemed on /unlock.
- **Teachers** must accept the teacher terms (no sharing/selling, legal consequences) before their code works; Studio can revoke a teacher (2026-11-02).
- Payments only in the LMS (Razorpay on `/unlock`). The website takes no money (Chirag, 2026-11-09).
- WhatsApp login codes: 1 per minute and 5 per hour per number (`otp_send_allowed`, 2026-11-09); per-IP limits come from Supabase Auth rate limits.
- Payment, order, enrollment and webhook API bodies are size-capped (`src/lib/body.js`).
- Account = the student; parent phone stored for messages; access lives on one account (Studio can move it).
- Free Module 0 on unlisted YouTube; paid modules move to **Bunny Stream** (signed links), on hold.
- Password login (email + mobile + password, no code) since 2026-11-14. WhatsApp codes wait for **Meta Business verification** (not DLT: DLT is SMS only). No SMS anywhere.
- GitHub `main` is the only source of truth. No separate folders or copies.
- **More courses will come later** (e.g. an advanced AI course). Don't build multi-course screens yet,
  but don't add new single-course assumptions either: always store `course_id` on new data, and prefer
  passing a course id over using the `COURSE_ID` constant in new code. The database (access, keys,
  enrollments, quizzes, assignments) is already per course; the screens assume one course today.

**Live database (checked 2026-11-09), plus `20261109000001_weekly_batches` (applied 2026-11-09 after "apply 1"):** applied through `20261109000001_weekly_batches`, plus `20261109000002_otp_send_limits` (live as version 20261109141955; don't apply again).
Plus `20261109000003_upload_limits_close_workshops` (applied 2026-11-09). `20261112000001_quiz_two_tries_xp_rules` applied 2026-11-13 (live under its own version number; do not apply again). `20261114000003_password_signup_limits` applied 2026-11-14 after "apply" (sign-up limit + `email_for_phone`). `20261115000001_lead_trash_and_merge` and `20261115000002_seen_watch_tracking` applied 2026-11-15 after "apply" (live under their own version numbers; do not apply again). **Duplicate prefix fixed 2026-11-20:** live has two migrations with version `20261116000003` (`whatsapp_optouts` and `leaderboard_visible_and_batches`). The leaderboard file was renamed to `20261116000004_leaderboard_visible_and_batches.sql` so no two files share a prefix; it is already applied, do not re-apply. Live migration history still lists it as `20261116000003`.

## Road to launch (2026-11-02, timed on real pace: ~5–6 PRs/hour, migration PR 10–20 min)
| Phase | What | Who | Time |
|---|---|---|---|
| A | ~~Codex Sprint 1 tasks 4–8~~ **Done 2026-11-02** | Codex → Claude review | |
| C | ~~CRM notes → bulk enrollment → workshops~~ **Done 2026-11-02**, plus dashboards/insights | Claude (SQL/backend) → Codex (UI) | |
| B | ~~Website payment → LMS~~ **Replaced:** payment moved into the LMS `/unlock` (Razorpay + WhatsApp key). Refunds: a full refund in the Razorpay dashboard now ends access automatically (webhook `refund.processed`, 2026-11-14); **Chirag: add the `refund.processed` event to the Razorpay webhook.** Partial refunds keep access. | Claude | done |
| D | **Testing and fixing** (in progress, `docs/TESTING.md`): code freeze; automatic tests; real phones (cheap Android, iPhone, WhatsApp browser, slow 4G) with 2–3 families on the full path; Studio pass; security re-audit; backup restore drill; fix all critical/high | Everyone | ~1 day |
| Launch | Vercel Pro, Supabase Pro, Resend sender, real Module 0 videos, ~~Razorpay live~~ done 2026-11-09 | Chirag | 1 day |
Not before launch: WhatsApp automations, certificates/QR, Bunny signed video, interactive video questions, a second course.

## In planning
- **Phase 2 plan and Codex prompt: `docs/PHASE-2.md`** (2026-11-02).
- **Backups:** nightly encrypted dump via GitHub Actions, 30 days: `docs/BACKUPS.md`. Needs Chirag's 2 GitHub secrets.
- **Funnel: see `docs/FUNNEL-PLAN.md`.** Phase 1 approved 2026-11-01 and in progress. Payments now run in the LMS (see table); WhatsApp messaging comes later.
- No open PRs (2026-11-09). ~35 stale branches from 2026-10-31 to 11-05 remain on GitHub (superseded work); clean up later.
- **Before Sun 15 Nov 10:00 IST:** Module 1 video is uploaded (one 50 min lesson, title still "Module 1"; consider splitting into 10–15 min lessons). Modules 2–5 need videos by 29 Nov, 22 Nov, 6 Dec, 13 Dec (Batch 1).
- **Next: Phase D testing** — real phones with 2–3 families on signup → lesson → progress, exercising the 2026-11-08 progress/resume and duplicate features.

## Done 2026-11-01
- `learn.beyondtatva.in` live (GoDaddy CNAME), Supabase Site URL + redirect, Google OAuth origin, Google app **In production**
  (no logo yet: a logo triggers Google brand verification).
- Env vars set (Production): LMS `SUPABASE_SERVICE_ROLE_KEY`, `ENROLLMENT_WEBHOOK_SECRET`; website `ENROLLMENT_WEBHOOK_SECRET`, `LMS_URL`.
- Leads/pipeline migration applied to Supabase.

## Done 2026-11-14 (PRs #153–#156, migrations 20261114000003–06, all applied)
- Login: email + mobile + password, automatic reset email (Resend SMTP), Profile → Password, Studio → New password.
- School Outreach sync fixed (was stuck 8–14 Nov), two status columns, sheet imported once.
- SRVK leads closed (37 Not interested + Poorvi Enrolled, history notes kept).
- CRM: Pipeline filters (school, class, section, siblings, status, source, due, search), group by school, Today school filter.
- New School Leads Tracker sheet (100-school setup) + incremental sync, tested on a copy; red banner if a sheet stops.
- Incident: `RAZORPAY_KEY_SECRET` was overwritten by mistake in Vercel and redeployed; Chirag fixed it the same day
  (payment tested). `SHEETS_SYNC_SECRET` rotated; both sheets re-keyed. Lesson: check the variable *name* before pasting.

## Done 2026-11-15 (PRs #158–#171, all migrations applied to live, production deploy = `main` 42bb9b2, READY)
- Studio tabs prefetch the whole page on hover / focus / touch (faster switching; cold starts on Vercel Hobby remain).
- Pipeline Open / Closed tabs grouped by school → status; analytics trimmed.
- Leads: 30-day trash + restore, merge duplicates. Payments stay void-only (revoke keeps the row); students keep delete-with-name (no undo yet).
- Clickable names everywhere in Studio, lead page, sheet columns on student and lead pages.
- Real watch tracking (parts played) + analytics rebuild + score without active days.
- Watch-tracking audit: 4 ways to fake completion (no-parts save, fake short length, idle-then-dump, inflated learning minutes) closed in `20261115000008` (tests M2d, Z13, Z17d/g, Z18, Z19/b). Next.js upgraded to 16.4.6 (PR #168). `20261115000004_sibling_phones.sql` added: it was applied to live without a file; the SQL was recovered from the live migration history.
- Found: a sheet row needs School, Student name and a **10-digit** parent phone before it syncs (note on the name cell otherwise).
- Live DB caught up: 14 Nov security hardening (`20261114000001`), workshop removal (`…02`), full leaderboard (`…07`), test-account marking (`20261115000006–07`) applied 15 Nov.
- Studio analytics fix (PR #171): "Module watching" always showed 0 started (fetchAll rows read wrongly).
- To check on a phone: play a module 2 min → % rises; drag to the end → not complete.

## Certificates + locked videos (2026-11-15, branch `claude/wizardly-faraday-fng2g6`)
- **Certificates:** premium ivory/gold design (`src/components/Certificate.js`). Unlocks only when every lesson of every module is watched
  (`issue_my_certificate`, migration `20261115000009`, tests K9–K19). A "Coming soon" module or a module with no lessons blocks it.
  ID like `BT-7F3A-C91E`; public check at `/verify/<ID>` shows first name + last initial only. Download = Save as PDF (A4 landscape).
  **Needs "apply" for `20261115000009` before merge.**
- **Locked paid videos (code already on main, switched off):** Chirag: Bunny → Stream library → Security → turn on
  *Embed view token authentication*, copy the token key, add it in Vercel as `BUNNY_EMBED_TOKEN_KEY` (Production + Preview), redeploy.
  Do the Vercel key + redeploy **first**, then switch Bunny on, or videos stop playing in between.

## Left to deploy / switch on (end of 2026-11-15): ALL DONE (Chirag confirmed 2026-11-15)
- [x] Razorpay `refund.processed` webhook event  - [x] Supabase reset template + email limit (+ phone sign-in)
- [x] Backup GitHub secrets  - [x] Vercel Pro / Supabase Pro  - [x] Module videos + weeks in Studio  - [x] Phone check + family test
Full feature audit, flaws and next fixes: **`docs/AUDIT-2026-11-15.md`**.

## Waiting on Chirag (2026-11-14) — superseded: Chirag confirmed all done 2026-11-15
- Old archived sheet ("Workshop Leads v2 … Srvk closed"): delete its two timers (it now fails every 5 min with the old key).
- Clean-up: delete test accounts "Test 1" and the school "lokis school"; merge Poorvi Hegde's duplicate account
  (Studio → People → Duplicates); decide if admin accounts should be left out of Pipeline (Claude: 1-line change).
- Supabase: paste the "Reset Password" email template (docs/login-setup.md step 5); raise email rate limit to ~100/hour.
- Supabase Phone provider + `SEND_SMS_HOOK_SECRET` so students can sign in by typing their mobile (step 6). Optional.
- Start Meta Business verification + a dedicated WhatsApp number (needed for WhatsApp automations and codes).
- Before the Durga workshop (Fri 20 Nov): enter forms in the School Leads Tracker; check Studio → Pipeline → Durga.
- Parent consent text: mention the XP leaderboard (first name + initial; opt-out in Profile).
- Real Module 0 videos; set each paid module's week in Studio → Content (Batch 1 starts 15 Nov 2026).

## Backlog (owner → task)
**Claude (lead: database, security, integrations)**
- Certificates: completion rule, certificate ID, public QR verification page, PDF.
- ~~Resend email sender~~ done (SMTP set). Login/reset email templates: Reset Password template given 2026-11-14.
- **Next: automations.** Message queue + templates + opt-in/do-not-contact checks + send log + scheduled sender.
  Email first (works now): welcome / how to log in, "module opens Sunday", inactive 7 days, payment received,
  "Send payment link" status → message. WhatsApp after Meta verification. Automations page in Studio shows sent/failed.
- CRM v2: per-person timeline (calls, messages, payments, progress) and auto follow-up tasks.
- Optional: hide admin/test accounts from Pipeline and analytics.
- Students: 30-day undo for account deletion (needs auth-account handling). Sheet: make "Not synced" rows obvious (red cell + count in A1).
- Bunny Stream signed playback for paid modules (on hold).
- **Play Store app** (TWA, no payment inside the app): checklist and status in `docs/PLAY-STORE.md`. Code side done; waiting on Chirag's Play Console account.
- Automations (WhatsApp provider + email), CRM: after launch.
- Interactive video editor (questions on the video timeline): later.

**Codex (builder: UI tasks, small PRs)**
- Earlier list (PWA install prompt, in-app browser warning, Profile edit + Help page, loading skeletons) is **done**. No open Codex task: wait for Claude to write the next one.

Codex tasks that need a table, an API route or auth changes: stop and hand back to Claude (Claude builds all SQL/backend).

## Monitoring (2026-11-20)
- PostHog (analytics) and Sentry (errors) via `src/instrumentation-client.js` + `src/instrumentation.js`. Keys are in
  Vercel. Minors: account id only, no names/emails/phones; recordings mask all text/inputs and block media.
- PostHog: page views, clicks, web vitals, heatmaps, exceptions, masked recordings. Funnel events: `signed_up`,
  `onboarding_completed`, `checkout_started`, `payment_completed` (once per payment, server: `src/lib/track.js`),
  `lesson_completed`, `quiz_submitted` (browser: `src/lib/track-client.js`). Website pages tag `app: website`.
- Sentry: errors (incl. error pages), 20% tracing, warn/error logs, replays on error only (masked), release = commit,
  cron monitor `whatsapp-automations` (/api/automations/run), uptime monitors for both sites.
- Tracking is tag-based so new content needs no code: lesson events carry `module`, `module_title`, `lesson_n`,
  `lesson_title`; `quiz_submitted` carries `quiz_title`; WhatsApp sends emit `whatsapp_sent|failed|opted_out` with
  `rule_key` + `campaign` (no phone/name, not a person). Person props: `role`, `grade`, `paid`. Studio → Analytics →
  Live tracking (`/admin/analytics/live`, `src/lib/monitoring.js`) groups by these tags.

## Class competition (2026-11-25)
Migration `20261125000001_class_section_race` applied live 25 Nov after "apply" (recorded as `class_section_race`; do not apply again). Optional `profiles.section` (A-F), `school_races` window, `school_race()` returns leading class names only. SVVN: 26 Nov 08:00 to 28 Nov 08:00 IST. Password sign-up limit is 150/hour, 300/day per IP while a race is on.
