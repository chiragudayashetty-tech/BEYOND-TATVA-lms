# Codex task: Phase 2, website payment → LMS unlock (repo `BEYOND-TATVA-web`)

Copy everything below the line into Codex.

---

You are Codex, the builder for Beyond Tatva. Work in the **`BEYOND-TATVA-web`** repo (the website,
www.beyondtatva.in). Read the LMS repo's `AGENTS.md` rules: one task per branch `codex/<task>` from the
latest `main`, small PRs, never commit secrets or `.env*`, no new paid services, don't change Vercel/
Razorpay/Supabase settings. Claude (lead) reviews; Chirag merges.

## Goal
When a payment succeeds on the website, the LMS (learn.beyondtatva.in) unlocks the course for that buyer.
A full refund removes it. Today `api/verify-payment.js` only returns `{verified:true}` and tells nobody.

## Rules decided by Chirag (don't change)
- **One login per child.** Whoever signs in to the LMS (the student, or the parent with their own Google
  account or phone) owns the student account. **The course can be opened only with that login.**
- The LMS unlocks automatically only on a **verified email or phone login** match. If only the parent
  phone matches, it waits for Chirag's approval in Studio. You don't need to do anything for that.
- Payments happen only on the website. Price shown on the website: ₹799.

## Build (3 small PRs, in this order)

### PR 1: `codex/lms-enrollment`. Tell the LMS after a verified payment
1. Add `api/_lms.js` exactly as in the LMS repo's `docs/website-enrollment.md` §2 (HMAC-SHA256 of
   `${timestamp}.${rawBody}` with `ENROLLMENT_WEBHOOK_SECRET`, headers `x-bt-timestamp`, `x-bt-signature`,
   POST `${LMS_URL}/api/enrollments`). It must never throw: payment success must not depend on the LMS.
2. In `api/verify-payment.js`, **only after** the Razorpay signature check passes, call
   `notifyLms({ event: "enrollment.paid", reference: razorpay_payment_id, email, phone, student_name,
   parent_name, amount_paise })`. Fetch the payment's real amount from Razorpay (server side, with the
   existing key) rather than trusting the browser. `email` = the Google email the buyer will sign in with;
   `phone` = the parent's 10-digit WhatsApp number.
3. Return `{ verified: true, lms: "claimed" | "pending" | "error" }` to the page.
4. Never log full phone numbers or emails (log the last 4 digits only).

### PR 2: `codex/checkout-login-note`. Checkout and success copy
1. Before paying, add a required field **"Email or phone you'll use to sign in to the course"**
   (Google email preferred) and this note, visible next to the Pay button:
   > The course can be opened only with this Google account or phone number. Your child signs in with the same one.
2. Success page:
   > Payment done. Open **learn.beyondtatva.in** and sign in with **{that email/phone}**. If the course
   > isn't open within a few minutes, message us on WhatsApp.
   If `lms` was `"error"`, still show success and add: "We'll unlock it for you shortly."
3. Mobile first (test at 320–430px), 44px tap targets, plain English for parents. Bump the `?v=` cache tags.

### PR 3: `codex/razorpay-refund-webhook`. Refunds
1. New `api/razorpay-webhook.js`: verify the `x-razorpay-signature` header with
   `RAZORPAY_WEBHOOK_SECRET` (HMAC-SHA256 of the raw body). Reject anything unsigned.
2. On `refund.processed` where the refund equals the full payment amount, call
   `notifyLms({ event: "enrollment.refunded", reference: payment_id })`. Partial refunds: log only.
3. Answer 200 quickly; retries of the same event must be harmless (the LMS ignores duplicates).
4. In the PR, write the steps for Chirag: Razorpay Dashboard → Webhooks → add
   `https://www.beyondtatva.in/api/razorpay-webhook`, event `refund.processed`, and set
   `RAZORPAY_WEBHOOK_SECRET` in the website's Vercel project (Production **and** Preview).

## Testing (paste the results in each PR)
- Unit-test the HMAC helper and the webhook signature check with fixed inputs (Node's built-in test runner,
  no new dependencies).
- Against a Preview deployment, with `LMS_URL` pointing at an LMS Preview: one test-mode payment shows
  `lms: "claimed"` or `"pending"`; the same request again is harmless; a test refund removes access.
- Say clearly what you could **not** test (e.g. live Razorpay).

## Stop and hand back to Claude if
- you need any change in the LMS repo (API shape, database, auth), or
- `/api/enrollments` answers anything other than `{ ok: true, status }` or a clear 4xx.
