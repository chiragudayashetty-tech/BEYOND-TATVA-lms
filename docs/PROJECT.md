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
- Merge PR for `feat/planner-sync-honest-copy`, then Claude applies the `study_plans` migration.
- Real Module 0 videos and real premiere dates (Studio → Content).
- Website: add the 3 snippets in `docs/website-enrollment.md`.
- Make the GitHub repos private.

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

Codex tasks that turn out to need a table, an API route or auth changes: stop and hand back to Claude.
