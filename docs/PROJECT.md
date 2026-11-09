# Beyond Tatva LMS: project status

_Maintained by Claude (lead). Last updated: 2026-11-09 (evening). If this file and the code disagree, the code on `main` wins: tell Claude._

AI course for Grades 8–10 in Udupi. The website (beyondtatva.in, separate repo `BEYOND-TATVA-web`) markets
and sells; this LMS is for learning and **also takes payment itself on `/unlock` (Razorpay)**. Students sign in, watch weekly modules, take quizzes and
hand in assignments. Chirag runs everything from **Studio** (`/admin`).

## Live
- App: https://learn.beyondtatva.in (also https://beyond-tatva-lms.vercel.app; Vercel project `beyond-tatva-lms`, region **bom1** Mumbai)
- Database/auth: Supabase project `fpubcjcqpsjnafnmkkzo` (ap-south-1 Mumbai)
- Studio admins: `studio_admins` table (exact emails or `@beyondtatva.in`), edited only in the Supabase dashboard.

## Built and live
| Area | Notes |
|---|---|
| Login | Email link (built-in sender: testing only), Google. Phone hidden until DLT. |
| Onboarding | One login per child: the student or a parent sets up the student account (parent WhatsApp required, child phone optional, consent tick). Teachers: teacher code. No parent accounts or codes. |
| Course | 1 course, Module 0 free (one fixed date) + paid modules, access via key/payment/admin. |
| Weekly batches | (2026-11-09) A student's batch = first Sunday 10:00 IST after they got course access; everyone before 15 Nov 2026 is Batch 1. Each paid module has a week (1–5) and opens on that batch Sunday. Batch 1 order: modules 1, 3, 2, 4, 5. Studio → Content shows each module's week and Batch 1 unlock date. |
| Video | YouTube (tracked, with fallback), Drive/Vimeo/Bunny embeds, MP4. 90% watched = complete. Bunny progress is tracked for real (saved every 15 s) and lessons resume where the student stopped (2026-11-08). Full screen turns the phone to landscape; iPhone falls back to native video full screen (2026-11-09). |
| Analytics v2 | Student scorecards, school roll-up (real school from linked workshop leads, Module 0 starts = Module 0 lessons only), PDF view tracking, honest scores from real progress (2026-11-08). |
| Duplicate accounts | Duplicate student logins are marked so analytics count each child once; Studio duplicate review merges into a main account, with undo (2026-11-08). |
| Signup school list | Sign-up offers a list of schools (2026-11-08). |
| Studio | Content, Quizzes, Assignments (marking queue), Enrollments, Access keys, People. |
| Quizzes | One per module, server-side marking, answers never sent to the browser. |
| Assignments | Text, link, photos/PDF (private bucket); mark, feedback, send back. |
| Website → LMS | `POST /api/leads` (signed) carries website leads. `POST /api/enrollments` exists but isn't needed while all payment happens on `/unlock`. |
| CRM notes | Pipeline "Notes (n)" per person, follow-ups due filter, due card on Studio home. |
| School bulk enrollment | Studio → School keys → Upload class list (CSV, max 200): one key per child, classes by grade + section; redeeming joins the class. |
| School outreach | Studio → School outreach (`/admin/outreach`, replaced Studio → Workshops 2026-11-08): add schools, status, contact, log calls/visits (dated history), next step + date, due/overdue filter. Reads/writes `outreach_schools` directly (admin RLS). Main record for outreach; the School Outreach sheet mirrors it every 5 min (see Google Sheets sync). Public `/w/<slug>` workshop sign-up still live. |
| Student dashboard | Course / XP + rank / quick-check rings; XP leaderboard (first name + initial, opt-out in Profile); XP = 10 per right quick check + quiz XP once + up to 50 per marked assignment. No streaks (Chirag). |
| Studio analytics | Funnel, sources, grades, revenue, module completion, quiz health + Insights: active students, paid-but-stopped 14+ d, lesson drop-off, sources that pay, refunds, schools, workshop funnel. Daily watch log (`learning_days`) since 2026-11-02. |
| Payments (how it works now) | **One place to pay: LMS `/unlock`.** Every website Enroll button → LMS sign-in → `/unlock` (new Google sign-ins can pay before onboarding). Razorpay: `POST /api/create-order` (price from DB, coupon via `coupon_price`) → modal → `POST /api/verify-payment` (HMAC + order belongs to this student) → `record_purchase` + `claim_purchases`. Second option: **Pay via WhatsApp**: Chirag confirms the payment and sends an **access key**, which the student redeems in the key box on `/unlock`. `RAZORPAY_KEY_ID`/`SECRET` and `NEXT_PUBLIC_SUPPORT_WHATSAPP` are set in Vercel (Production + Preview, 2026-11-04). **Live keys; KYC done; real ₹ payment tested end to end by Chirag 2026-11-09** (after paying, `/unlock` now does a full page load to `/course`; before, the cached pay page stayed until a tab switch). The website's own Razorpay checkout (`/api` in BEYOND-TATVA-web) is no longer the main path. |
| Google Sheets sync | Two spreadsheets, never copies. **Workshop leads**: one tab per source: a tab per school workshop (auto-created when outreach status = "Workshop done" or a lead arrives), "Website" (website + Loki chat), "Manual"; all ↔ `leads` (`leads.tab` / `lead_tab()`). **School Outreach**: one row per school ↔ `outreach_schools`; **the LMS is the main record** (since 2026-11-08): every pull rewrites the tab from the LMS (adds, updates, removes schools deleted in Studio); sheet edits push only if the row's hidden **Version** (= `updated_at` at last pull) is still current, else skipped as `stale` and refreshed; Calls / Visits / History are LMS-only (Studio "Log call / Log visit"); a sheet row edited after its school was deleted in Studio is not re-created. `scripts/sheets-sync.gs` pushes edits (`POST /api/sheets`) and pulls every 5 min (`GET /api/sheets`, header `x-sheets-key` = `SHEETS_SYNC_SECRET`). Rows match by hidden **ID**; same phone + same/no child name is merged automatically (`sheet_merge_duplicates`), siblings kept and noted; "LMS email" links a lead to an account. LMS owns **Source / Signed up / Module 0 / Paid?**. |
| Lead write-back | `leads.updated_source` ('sheet'/'studio'). A Studio → Today log sets 'studio'; the next pull (5 min) writes only the differing cells back into the Workshop leads sheet: Status / Next step / Next date / Do not contact. A sheet edit pushes with `touched` = the edited fields: for a 'studio' lead only those are taken (a stale row can't wipe a Studio log) and the lead flips to 'sheet' once the sheet has caught up. Last write wins. LMS-owned lead columns are now written cell by cell (formulas elsewhere survive). Schools follow the School outreach rules above (LMS is the main record). |
| Studio → Today | `/admin/today` (first nav item, mobile tab): counts (schools/leads due today or overdue, paid this week), schools to follow up (next date ≤ 7 days or Meeting set / Workshop booked, not Not interested), leads to follow up (from `sheet_snapshot` via the service-role client after an admin check: not paid, not do-not-contact, due ≤ 7 days or status empty / "interested" / "call", not "not interested"), grouped by tab. Call, WhatsApp (prefilled greeting) and Log: schools → `logOutreach` (WhatsApp counts as a call) + status/next step/date; leads → `admin_log_lead_contact` (CRM note, follow-up 10:00 IST). |
| Payment safety net | `POST /api/razorpay-webhook` (2026-11-09): Razorpay tells us about every captured payment even if the browser closed; records the purchase for the student in the order notes, safe to receive twice. **Needs Chirag:** Razorpay → Settings → Webhooks (URL `https://learn.beyondtatva.in/api/razorpay-webhook`, events `payment.captured`, `order.paid`) and the same secret as `RAZORPAY_WEBHOOK_SECRET` in Vercel. |
| Limits (2026-11-09) | Uploads: 10 MB + file types on the bucket, max 10 files per assignment and 200 per student (DB rule). Workshop sign-up: max 40 per workshop per 10 min. WhatsApp login codes: 1/min, 5/hour per phone. Studio Assignments/Enrollments show "Show more" when the list hits its limit. |
| Load test | `scripts/load-test.mjs`: N test accounts sign in and open dashboard/course/lesson at once, prints p50/p95/p99. Preview only (refuses production). Not run yet. |
| Coupons | Studio → Enrollments → Coupons (code + price + time window). Applied on `/unlock`, priced on the server via `coupon_price`. |
| Module attachments | Studio → Content → module → Attachments (PDF/images ≤ 25 MB); students View/Download/Download all on open modules. |
| Tests | `npm test`, `npm run test:db`, `npm run test:e2e` (Playwright smoke; 2 checks parked as TODO). |
| Pipeline | Studio → Pipeline: one row per person, stages 1–5 (lead → bought), "stopped >24h" filter, CSV export, Parents / School enquiries tabs. Leads matched to students by parent phone; `?src=`/UTM saved at sign-up. |

## Decisions (don't reopen without Chirag)
- **Website and LMS are completely separate.** The website (www.beyondtatva.in) is the front door for
  everyone: marketing, posts, selling, enrolling. The LMS (learn.beyondtatva.in) is only for
  enrolled students and people who choose "Try Module 0 free". No automatic redirects between them,
  only links the owner places (website: "Log in" / "Start free"; LMS: "Get the full course").
- **The login is the key** for individual buyers. **School deals use student keys** (2026-11-02): Studio → School keys makes one key per student, redeemed on /unlock.
- **Teachers** must accept the teacher terms (no sharing/selling, legal consequences) before their code works; Studio can revoke a teacher (2026-11-02).
- ~~Payments only on the website~~ **Superseded:** the LMS takes payment on `/unlock` via Razorpay (see table). The website markets; its Enroll buttons send people to `/unlock`.
- Account = the student; parent phone stored for messages; access lives on one account (Studio can move it).
- Free Module 0 on unlisted YouTube; paid modules move to **Bunny Stream** (signed links), on hold.
- Phone/WhatsApp login waits for DLT registration.
- GitHub `main` is the only source of truth. No separate folders or copies.
- **More courses will come later** (e.g. an advanced AI course). Don't build multi-course screens yet,
  but don't add new single-course assumptions either: always store `course_id` on new data, and prefer
  passing a course id over using the `COURSE_ID` constant in new code. The database (access, keys,
  enrollments, quizzes, assignments) is already per course; the screens assume one course today.

**Live database (checked 2026-11-09):** applied through `20261109000001_weekly_batches`, plus `20261109000002_otp_send_limits` (was applied live before its file existed; the file is a word-for-word copy, don't apply again).
**Waiting for "apply":** `20261109000003_upload_and_signup_limits`.

## Road to launch (2026-11-02, timed on real pace: ~5–6 PRs/hour, migration PR 10–20 min)
| Phase | What | Who | Time |
|---|---|---|---|
| A | ~~Codex Sprint 1 tasks 4–8~~ **Done 2026-11-02** | Codex → Claude review | |
| C | ~~CRM notes → bulk enrollment → workshops~~ **Done 2026-11-02**, plus dashboards/insights | Claude (SQL/backend) → Codex (UI) | |
| B | ~~Website payment → LMS~~ **Replaced:** payment moved into the LMS `/unlock` (Razorpay + WhatsApp key). Left: refunds flow | Claude | ~1 h |
| D | **Testing and fixing** (in progress, `docs/TESTING.md`): code freeze; automatic tests; real phones (cheap Android, iPhone, WhatsApp browser, slow 4G) with 2–3 families on the full path; Studio pass; security re-audit; backup restore drill; fix all critical/high | Everyone | ~1 day |
| Launch | Vercel Pro, Supabase Pro, Resend sender, real Module 0 videos, ~~Razorpay live~~ done 2026-11-09 | Chirag | 1 day |
Not before launch: WhatsApp automations, certificates/QR, Bunny signed video, interactive video questions, a second course.

## In planning
- **Phase 2 plan and Codex prompt: `docs/PHASE-2.md`** (2026-11-02).
- **Backups:** nightly encrypted dump via GitHub Actions, 30 days: `docs/BACKUPS.md`. Needs Chirag's 2 GitHub secrets.
- **Funnel: see `docs/FUNNEL-PLAN.md`.** Phase 1 approved 2026-11-01 and in progress. Payments now run in the LMS (see table); WhatsApp messaging comes later.
- No open PRs (2026-11-09). ~35 stale branches from 2026-10-31 to 11-05 remain on GitHub (superseded work); clean up later.
- **Next: Phase D testing** — real phones with 2–3 families on signup → lesson → progress, exercising the 2026-11-08 progress/resume and duplicate features.

## Done 2026-11-01
- `learn.beyondtatva.in` live (GoDaddy CNAME), Supabase Site URL + redirect, Google OAuth origin, Google app **In production**
  (no logo yet: a logo triggers Google brand verification).
- Env vars set (Production): LMS `SUPABASE_SERVICE_ROLE_KEY`, `ENROLLMENT_WEBHOOK_SECRET`; website `ENROLLMENT_WEBHOOK_SECRET`, `LMS_URL`.
- Leads/pipeline migration applied to Supabase.

## Waiting on Chirag
- Parent consent text: mention the XP leaderboard (first name + initial; opt-out in Profile).
- Real Module 0 videos; set each paid module's week in Studio → Content (Batch 1 starts 15 Nov 2026).

## Backlog (owner → task)
**Claude (lead: database, security, integrations)**
- Certificates: completion rule, certificate ID, public QR verification page, PDF.
- Resend email sender + login code email templates (before students use email login).
- Bunny Stream signed playback for paid modules (on hold).
- Automations (WhatsApp provider + email), CRM: after launch.
- Interactive video editor (questions on the video timeline): later.

**Codex (builder: UI tasks, small PRs)**
- Earlier list (PWA install prompt, in-app browser warning, Profile edit + Help page, loading skeletons) is **done**. No open Codex task: wait for Claude to write the next one.

Codex tasks that need a table, an API route or auth changes: stop and hand back to Claude (Claude builds all SQL/backend).
