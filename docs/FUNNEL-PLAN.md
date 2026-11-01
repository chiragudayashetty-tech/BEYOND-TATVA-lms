# Funnel plan

Owner's structure, given 2026-11-01. **Phase 1 approved 2026-11-01.**

## Decisions (2026-11-01)
1. Only the LMS 30-minute Module 0; the website mini-lesson is retired. 2. Loki's last step → LMS sign-in.
3. Google Sheet stays as the lead backup for now. 4. `learn.beyondtatva.in`: yes. 5. WhatsApp goes to the parent.
6. Google sign-in now, parent phone required at sign-up; DLT process started for phone login later.
7. Stage 3 "stopped" = 24 h without progress (students watch at home after school).
- **No offline funnel, slips or codes. The login is the key.** Paper forms/QR just point to the website.
- Payments wait for Razorpay KYC (PAN). Until then: UPI + Studio → Enrollments. Messaging is planned later.

## Phases
- **Phase 1 (now):** website → LMS sign-in (Codex, website); leads API, signup source, Studio Pipeline,
  access keys hidden (Claude, LMS, PR `claude/leads-pipeline`); lead forwarder on the website (Codex, after that PR);
  PWA phones-only, in-app browser warning, skeletons (Codex, LMS).
- **Phase 2 (Razorpay live):** website payment → `/api/enrollments`, refund webhook.
- **Phase 3:** WhatsApp automations, certificates, course after purchase, schools.

(Below: the original draft and review, kept for reference.)

## The journey
1. Visitor lands on the **website** (www.beyondtatva.in, Vercel project `beyond-tatva-web-lptp`), fills in details.
2. **Signs in to the LMS** (Google now; phone number later). That account is their ID.
3. Gets **Module 0** (one 30-minute video, free). On phones (Android/iPhone only, not laptops) the
   "Add to home screen" tutorial runs.
4. Can roam the whole LMS; the course stays locked until they buy.
5. Buys on the **website** → course unlocks in the LMS.
Website and LMS stay separate; no automatic redirects (see docs/PROJECT.md).

## Pipelines (WhatsApp follow-up per stage; everyone is pushed toward stage 5)
| # | Stage | Signal |
|---|---|---|
| 1 | Lead: filled details on the website, never signed in | Lead saved, no LMS account with that phone |
| 2 | Signed in, didn't start Module 0 | Account, 0 seconds watched |
| 3 | Started, stopped (watched ~5–15 min, didn't continue) | Watch time recorded, no progress for X hours |
| 4 | Finished Module 0, didn't buy | ≥90% watched, no enrollment |
| 5 | Bought | Enrollment / course access |

## How the website works today (reviewed from beyond-tatva-web @ ea8642f)
- **Loki chat** (`assets/js/home.js`, EN/Kannada): who/class/board/goal, then **parent name + WhatsApp**
  → `BTLead` (`assets/js/lead.js`) posts to a **Google Form → Google Sheet**. No email collected.
  (`config.js` mentions Zoho, but that's out of date.)
- "Module 0 unlocked" is a localStorage flag; the button opens `BT_CONFIG.module0Url` = a **Google Classroom link**.
- A separate website mini-lesson `module-0` (`assets/js/module0.js`, 15 min, 4 steps) also exists.
- `module0.html`: form (parent name, student name, class, school, parent WhatsApp, consents) → same Google Form.
- **Payment** (`assets/js/pay.js`, `api/create-order.js`, `api/verify-payment.js`): parent consent → Razorpay
  (name + phone prefilled, LOKI5 coupon) → verify returns `{verified:true}` only. **Nothing is recorded and
  the LMS is not told.** No refund handling.
- **Price on the website: ₹799 (list ₹2499).** The LMS course price is 999. Set it to 799 in Studio → Content.

## Gaps vs the plan
- Leads only in a Google Sheet, so stage 1 can't be tracked.
- Module 0 points to Google Classroom, not the LMS, so there's no sign-in, no home-screen step and no watch tracking.
- Two different "Module 0"s.
- Payment doesn't unlock the LMS or handle refunds.
- Website identity is the **parent phone**; the LMS signs in with Google (email). Match on the **parent phone**
  (`profiles.guardian_phone`, already supported by `record_purchase` / `claim_purchases`).
- PWA install prompt (PR #10) should show on **phones only**, not laptops.

## Proposed connection (awaiting approval)
- **Claude (LMS):** `leads` table + signed `POST /api/leads`; match leads to accounts by phone; stage view
  (one row per person: stage + timestamps); Studio "Pipeline" tab (replaces the CRM placeholder) with counts,
  lists and export; later a webhook/cron that tells the WhatsApp provider when someone enters a stage.
- **Codex (website):** Loki/module0 forms also send the lead to the LMS through a small server-side forwarder
  (`/api/lead`, holds the shared secret); the "Watch Module 0" button goes to the LMS sign-in; after a verified
  payment, call the LMS `/api/enrollments` (see docs/website-enrollment.md); Razorpay refund webhook →
  `enrollment.refunded`.
- **Chirag:** price 799 in Studio; shared secret in both Vercel projects; domain `learn.beyondtatva.in`.

## Open decisions (Chirag)
1. Keep only the LMS 30-minute Module 0 and retire the website mini-lesson? (recommended: yes)
2. Loki's last step sends people straight to the LMS sign-in? (recommended: yes)
3. Keep the Google Sheet as a backup copy of leads? (recommended: yes, for now)
4. Add `learn.beyondtatva.in` to the LMS Vercel project (+1 GoDaddy CNAME)?
5. Who gets WhatsApp messages: parent (recommended: minors, DPDP, parent pays) or student?
6. Phone sign-in at launch, or Google now with the phone collected at sign-up (recommended), phone OTP later?
7. Stage 3 "stopped": how many hours without progress?
8. Message timing per stage (e.g. after 1 h, 1 day, 3 days).
9. WhatsApp provider (AiSensy / Interakt / WATI; paid). Choose when automations are built.
10. The rest of the structure (after purchase: course, schools, certificates) still to come from Chirag.
