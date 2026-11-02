# Secrets on Vercel Preview (audit L3)

Today the LMS secrets exist for **Production** only, so Preview deployments (every PR) fail on
`/api/enrollments`, `/api/leads` and Studio → Delete (uploaded files). Fix (Chirag, ~3 minutes):

1. Vercel → project **beyond-tatva-lms** → **Settings → Environment Variables**.
2. For each of these, click the **⋯** → **Edit** → tick **Preview** as well as Production → **Save**:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENROLLMENT_WEBHOOK_SECRET`
3. Vercel → project **beyond-tatva-web-lptp** → same for `ENROLLMENT_WEBHOOK_SECRET` and `LMS_URL`
   (and `RAZORPAY_WEBHOOK_SECRET` once Codex's refund webhook exists).
4. Redeploy the latest Preview (Deployments → ⋯ → Redeploy) for the change to apply.

Notes
- Previews share the **same live database**. A test enrollment sent to a Preview is a real enrollment.
  Use references starting with `test_` and revoke them in Studio → Enrollments afterwards.
- Never add these to **Development** on a shared machine, and never paste them in chats or PRs.
