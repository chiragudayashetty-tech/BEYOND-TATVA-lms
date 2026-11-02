# Testing and fixing phase (phase D)

_Started 2026-11-02. Claude (lead) keeps this file current. Code freeze: only fixes merge until launch._

## 1. Automatic tests (Claude): green on `main`
| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | 32/32 |
| `npm run build` | compiles |
| `npm run test:db` (all migrations on a fresh Postgres + behaviour tests) | all pass |
| `npm run test:e2e` (Playwright: pages at 320/375 px, tap targets ≥ 44 px, no sideways scroll, no console errors; Studio pages) | 34 pass, 2 parked (lock check, bottom tabs: selectors don't match preview mode yet) |

## 2. Security re-audit (Claude, 2026-11-02): live database
Supabase security advisor + manual checks of live grants:
- **No critical or high findings.**
- Students can update only safe profile columns (name etc.). `role` and `school_id` are **not** writable (column grants checked live). Studio admin needs `role = admin` **and** a confirmed email on the Studio list.
- Public (not signed in) can call only `get_workshop` and `register_workshop`. Both are intended for `/w/…`.
- Every table has RLS. `studio_admins` has no policies on purpose (edited only in the Supabase dashboard).
- "Leaked password protection": not relevant (no passwords; email link + Google).
- Low, accepted: a student can set a rude display name, which other students would see on the leaderboard as a first name. Fix if it happens: Studio → People → edit name; the student can hide/be hidden.
- Low, accepted: a bot could fill workshop seats with fake numbers (see PR 56). Add Vercel rate limiting if it happens.
- Performance advisor: one missing index (`data_deletions.deleted_by`, tiny table) and some "multiple policies" notes. Fine at our size; tidy after launch.

## 3. Real phones (Chirag + 2–3 families): **to do**
Phones: one cheap Android (Chrome), one iPhone (Safari), and links opened **inside WhatsApp**. One run on slow 4G
(or Chrome → DevTools → "Slow 4G"). For each, tick ✅/❌ and send Claude a screenshot of anything odd.

**A. New family (parent's phone)**
1. Open `learn.beyondtatva.in` from a WhatsApp message → Sign in with Google (and once with email link).
2. "I'm a parent" → set up the child: name, grade, parent WhatsApp, consent tick → lands on the dashboard.
3. Dashboard: course ring, XP card, "Top learners", free-plan banner. Nothing cut off, no sideways scroll.
4. Module 0: play a lesson to the end → it's marked done; answer a quick check → XP goes up.
5. Locked module shows "Unlock"; `/unlock` with a **test school key** → modules open.
6. Planner: add a task on a day, tick it; days are easy to tap.
7. Assignments: hand in a photo from the camera (try a big photo) and a PDF.
8. Quiz: fail once, pass once; XP goes up only once.
9. Profile: dark mode switch, "Show me on the leaderboard" off → you disappear from Top learners.
10. Install prompt / "Add to home screen" works; reopening keeps you signed in.

**B. Workshop parent (no account)**
1. Open a test workshop link `/w/<name>` from WhatsApp, not signed in.
2. Sign up with consent ticked → "You're registered". Again with the same number → "already registered".
3. Studio → Workshops: the sign-up is there; tap "Check in" on a phone; CSV downloads and opens.
4. Studio → Pipeline: the parent appears as a lead (source `workshop`).

**C. School (Studio on Chirag's phone and laptop)**
1. Studio → School keys → Upload class list with a 3-row CSV (one bad phone number first: errors show, nothing saved; fix it: keys created; download CSV).
2. A test child redeems one key → shows in that class (Studio → People).

## 4. Studio pass (Chirag, laptop, ~30 min): **to do**
Every Studio page loads and makes sense with real data: Content, Quizzes, Assignments (mark one), Enrollments,
School keys, People (export + delete a **test** student), Pipeline (notes, follow-ups due), Analytics + Insights,
Workshops. Write down anything confusing, not just broken.

## 5. Backup restore drill (Chirag + Claude, ~15 min): **to do**
Needs the backup passphrase, which only Chirag has. Steps in `docs/BACKUPS.md` → "Restore drill": download the
latest backup from GitHub Actions, run `scripts/restore-backup.sh` locally, check the row counts. Claude can run it
in a session if Chirag pastes the passphrase into an environment secret (never in chat or a PR).

## 6. Fix list
Severity: **critical** (data leak, money, can't sign in) and **high** (core path broken on a common phone) must be fixed before launch.
| # | Found | Severity | What | Status |
|---|---|---|---|---|
| 1 | Smoke tests | low | Theme switch and Pipeline filter link < 44 px | fixed (PR 56) |
| 2 | Review | low | School rows showed "null"; Profile hint promised streaks | fixed (PR 65) |
