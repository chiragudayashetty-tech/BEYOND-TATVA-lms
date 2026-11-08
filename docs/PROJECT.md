# Beyond Tatva LMS: project status

_Maintained by Claude (lead). Last updated: 2026-11-01._

AI course for Grades 8–10 in Udupi. **Payments happen on the website** (beyondtatva.in, separate repo
`BEYOND-TATVA-web`); this LMS is for learning. Students sign in, watch weekly modules, take quizzes and
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
| Course | 1 course, Module 0 free + 6 weekly modules (`release_at`), access via key/payment/admin. |
| Video | YouTube (tracked, with fallback), Drive/Vimeo/Bunny embeds, MP4. 90% watched = complete. |
| Studio | Content, Quizzes, Assignments (marking queue), Enrollments, Access keys, People. |
| Quizzes | One per module, server-side marking, answers never sent to the browser. |
| Assignments | Text, link, photos/PDF (private bucket); mark, feedback, send back. |
| Website → LMS | `POST /api/enrollments` and `POST /api/leads` (signed). Website side not connected yet: `docs/website-enrollment.md`. |
| CRM notes | Pipeline "Notes (n)" per person, follow-ups due filter, due card on Studio home. |
| School bulk enrollment | Studio → School keys → Upload class list (CSV, max 200): one key per child, classes by grade + section; redeeming joins the class. |
| School outreach | Studio → School outreach (`/admin/outreach`, replaced Studio → Workshops 2026-11-08): add schools, status, contact, log calls/visits (dated history), next step + date, due/overdue filter. Reads/writes `outreach_schools` directly (admin RLS). Main record for outreach; the School Outreach sheet mirrors it every 5 min (see Google Sheets sync). Public `/w/<slug>` workshop sign-up still live. |
| Student dashboard | Course / XP + rank / quick-check rings; XP leaderboard (first name + initial, opt-out in Profile); XP = 10 per right quick check + quiz XP once + up to 50 per marked assignment. No streaks (Chirag). |
| Studio analytics | Funnel, sources, grades, revenue, module completion, quiz health + Insights: active students, paid-but-stopped 14+ d, lesson drop-off, sources that pay, refunds, schools, workshop funnel. Daily watch log (`learning_days`) since 2026-11-02. |
| Razorpay in the LMS | `/unlock` → `POST /api/create-order` (price from DB, student id in order notes) → Razorpay modal → `POST /api/verify-payment` (HMAC signature + order belongs to this student) → `record_purchase` + `claim_purchases`. On when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in Vercel; the only payment option on `/unlock` (UPI screenshot flow removed). Any failure shows a WhatsApp button (`NEXT_PUBLIC_SUPPORT_WHATSAPP`). |
| Google Sheets sync | Two spreadsheets, never copies. **Workshop leads**: one tab per source: a tab per school workshop (auto-created when outreach status = "Workshop done" or a lead arrives), "Website" (website + Loki chat), "Manual"; all ↔ `leads` (`leads.tab` / `lead_tab()`). **School Outreach**: one row per school ↔ `outreach_schools`; **the LMS is the main record** (since 2026-11-08): every pull rewrites the tab from the LMS (adds, updates, removes schools deleted in Studio); sheet edits push only if the row's hidden **Version** (= `updated_at` at last pull) is still current, else skipped as `stale` and refreshed; Calls / Visits / History are LMS-only (Studio "Log call / Log visit"); a sheet row edited after its school was deleted in Studio is not re-created. `scripts/sheets-sync.gs` pushes edits (`POST /api/sheets`) and pulls every 5 min (`GET /api/sheets`, header `x-sheets-key` = `SHEETS_SYNC_SECRET`). Rows match by hidden **ID**; same phone + same/no child name is merged automatically (`sheet_merge_duplicates`), siblings kept and noted; "LMS email" links a lead to an account. LMS owns **Source / Signed up / Module 0 / Paid?**. |
| Lead write-back | `leads.updated_source` ('sheet'/'studio'). A Studio → Today log sets 'studio'; the next pull (5 min) writes only the differing cells back into the Workshop leads sheet: Status / Next step / Next date / Do not contact. A sheet edit pushes with `touched` = the edited fields: for a 'studio' lead only those are taken (a stale row can't wipe a Studio log) and the lead flips to 'sheet' once the sheet has caught up. Last write wins. LMS-owned lead columns are now written cell by cell (formulas elsewhere survive). Schools follow the School outreach rules above (LMS is the main record). |
| Studio → Today | `/admin/today` (first nav item, mobile tab): counts (schools/leads due today or overdue, paid this week), schools to follow up (next date ≤ 7 days or Meeting set / Workshop booked, not Not interested), leads to follow up (from `sheet_snapshot` via the service-role client after an admin check: not paid, not do-not-contact, due ≤ 7 days or status empty / "interested" / "call", not "not interested"), grouped by tab. Call, WhatsApp (prefilled greeting) and Log: schools → `logOutreach` (WhatsApp counts as a call) + status/next step/date; leads → `admin_log_lead_contact` (CRM note, follow-up 10:00 IST). |
| Coupons | Studio → Enrollments → Coupons (code + price + time window). Applied on `/unlock`, priced on the server via `coupon_price`. |
| Module attachments | Studio → Content → module → Attachments (PDF/images ≤ 25 MB); students View/Download/Download all on open modules. |
| Tests | `npm test`, `npm run test:db`, `npm run test:e2e` (Playwright smoke; 2 checks parked as TODO). |
| Pipeline | Studio → Pipeline: one row per person, stages 1–5 (lead → bought), "stopped >24h" filter, CSV export, Parents / School enquiries tabs. Leads matched to students by parent phone; `?src=`/UTM saved at sign-up. |

## Decisions (don't reopen without Chirag)
- **Website and LMS are completely separate.** The website (www.beyondtatva.in) is the front door for
  everyone: marketing, posts, selling, enrolling. The LMS (planned: learn.beyondtatva.in) is only for
  enrolled students and people who choose "Try Module 0 free". No automatic redirects between them,
  only links the owner places (website: "Log in" / "Start free"; LMS: "Get the full course").
- **The login is the key** for individual buyers. **School deals use student keys** (2026-11-02): Studio → School keys makes one key per student, redeemed on /unlock.
- **Teachers** must accept the teacher terms (no sharing/selling, legal consequences) before their code works; Studio can revoke a teacher (2026-11-02).
- Payments only on the website; the LMS never takes money.
- Account = the student; parent phone stored for messages; access lives on one account (Studio can move it).
- Free Module 0 on unlisted YouTube; paid modules move to **Bunny Stream** (signed links), on hold.
- Phone/WhatsApp login waits for DLT registration.
- GitHub `main` is the only source of truth. No separate folders or copies.
- **More courses will come later** (e.g. an advanced AI course). Don't build multi-course screens yet,
  but don't add new single-course assumptions either: always store `course_id` on new data, and prefer
  passing a course id over using the `COURSE_ID` constant in new code. The database (access, keys,
  enrollments, quizzes, assignments) is already per course; the screens assume one course today.

**Live database:** migrations through `20261104000003_coupons` (applied 2026-11-04 after Chirag's "apply 13").

## Road to launch (2026-11-02, timed on real pace: ~5–6 PRs/hour, migration PR 10–20 min)
| Phase | What | Who | Time |
|---|---|---|---|
| A | ~~Codex Sprint 1 tasks 4–8~~ **Done 2026-11-02** | Codex → Claude review | |
| C | ~~CRM notes → bulk enrollment → workshops~~ **Done 2026-11-02**, plus dashboards/insights | Claude (SQL/backend) → Codex (UI) | |
| B | Website payment → LMS, refunds (`docs/CODEX-PHASE-2.md`) | Codex (website) | ~1–2 h, **after Razorpay KYC** |
| D | **Testing and fixing** (in progress, `docs/TESTING.md`): code freeze; automatic tests; real phones (cheap Android, iPhone, WhatsApp browser, slow 4G) with 2–3 families on the full path; Studio pass; security re-audit; backup restore drill; fix all critical/high | Everyone | ~1 day |
| Launch | Vercel Pro, Supabase Pro, Resend sender, real Module 0 videos, Razorpay live | Chirag | 1 day |
Not before launch: WhatsApp automations, certificates/QR, Bunny signed video, interactive video questions, a second course.

## In planning
- **Phase 2 plan and Codex prompt: `docs/PHASE-2.md`** (2026-11-02).
- **Backups:** nightly encrypted dump via GitHub Actions, 30 days: `docs/BACKUPS.md`. Needs Chirag's 2 GitHub secrets.
- **Funnel: see `docs/FUNNEL-PLAN.md`.** Phase 1 approved 2026-11-01 and in progress. Payments (Razorpay KYC on hold) and WhatsApp messaging come later.
- Open PRs at hand-off: #9 (simple homepage), #10 (Codex PWA, approved by lead: limit to phones later),
  #11 (project notes).

## Done 2026-11-01
- `learn.beyondtatva.in` live (GoDaddy CNAME), Supabase Site URL + redirect, Google OAuth origin, Google app **In production**
  (no logo yet: a logo triggers Google brand verification).
- Env vars set (Production): LMS `SUPABASE_SERVICE_ROLE_KEY`, `ENROLLMENT_WEBHOOK_SECRET`; website `ENROLLMENT_WEBHOOK_SECRET`, `LMS_URL`.
- Leads/pipeline migration applied to Supabase.

## Open at hand-off (2026-11-01)
- Website (Codex): finish `codex/lead-forwarder` (bump `?v=` cache tags) and `codex/lms-domain`
  (links/redirects → learn.beyondtatva.in). Then Claude sends a live test lead and checks Pipeline.
- Website `LMS_URL` env var must be `https://learn.beyondtatva.in`.
- Close PR #10 (replaced by #14).

## Waiting on Chirag
- **Razorpay KYC** (blocks phase B). Vercel Preview secrets (`docs/PREVIEW-SECRETS.md`), `NEXT_PUBLIC_SUPPORT_WHATSAPP` in Vercel.
- Parent consent text: mention the XP leaderboard (first name + initial; opt-out in Profile).
- Real Module 0 videos and real premiere dates (Studio → Content).
- Website: add the 3 snippets in `docs/website-enrollment.md`.

## Backlog (owner → task)
**Claude (lead: database, security, integrations)**
- Certificates: completion rule, certificate ID, public QR verification page, PDF.
- Resend email sender + login code email templates (before students use email login).
- Bunny Stream signed playback for paid modules (on hold).
- Automations (WhatsApp provider + email), CRM: after launch.
- Interactive video editor (questions on the video timeline): later.

**Codex (builder: UI tasks, small PRs)**
1. "Install as app" (PWA): manifest, icons, Android install prompt, iPhone "Add to Home Screen" guide, skippable.
2. In-app browser warning: detect WhatsApp/Instagram/Facebook browsers on /login and ask to open in Chrome/Safari.
3. Profile page: make "Edit profile" (name, avatar) work; "Help and support" page with WhatsApp contact.
4. Loading skeletons (`loading.js`) for /course, /watch, /admin pages.

Codex tasks that need a table, an API route or auth changes: stop and hand back to Claude (Claude builds all SQL/backend).
