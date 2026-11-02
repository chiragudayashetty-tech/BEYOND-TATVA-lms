<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Team rules (Claude = lead, Codex = builder, Chirag = owner)

Two AI agents work on this repo. Read this and `docs/PROJECT.md` before every task.

## Roles (changed by Chirag 2026-11-02: Codex builds everything, Claude reviews and merges)
- **Chirag (owner):** decides priorities, owns all accounts and secrets. Approves every **live database
  change** ("apply N") and anything touching money, accounts, secrets or paid services.
- **Claude (lead):** architecture, security review, reviews **every** PR (runs lint, tests, build and
  `npm run test:db`), fixes small issues on top or sends it back, **merges**, applies migrations to live
  **only after Chirag's "apply"**, keeps `docs/PROJECT.md` current.
- **Codex (builder):** builds all features, one scoped task per PR, **including SQL migrations and their
  tests** (writes files only; never runs SQL against Supabase).

## Every task
1. **Start from the latest `main`:** `git fetch origin && git checkout -b <agent>/<task> origin/main`.
   Never work from an old copy or a separate folder. Never commit to `main`.
2. Branch names: `claude/<task>` or `codex/<task>`. One task per branch, small PRs.
3. Before opening a PR run: `npm run lint`, `npm test`, `npm run build`
   (and `npm run test:db` when SQL changed). Paste the results in the PR.
4. PR description: what changed, why, how it was tested, what was **not** tested.
5. Claude reviews and merges. Don't merge your own PR. End each PR with "Ready for Claude's review."

## Hard limits for Codex
- **Database:** you may add **new** files in `supabase/migrations/` (name `YYYYMMDDHHMMSS_<what>.sql`, later than
  the newest one) with tests in `supabase/tests/studio_test.sql`, and `npm run test:db` must pass. Never edit an
  existing migration, never run SQL against Supabase. Every new table: RLS on, policies for each role, indexes on
  foreign keys; functions `security definer set search_path = ''`, `revoke ... from public, anon`, admin checks
  via `public.is_admin()`. Never weaken an existing policy without saying so in the PR title.
- **Security-critical files** (`src/proxy.js`, `src/lib/supabase/*`, `src/app/api/**`, `src/app/auth/**`,
  `src/lib/enrollments.js`, `src/app/admin/actions.js`, `vercel.json`, `.github/**`): allowed, but put
  **"SECURITY:"** at the start of the PR title and explain the change; Claude reviews these line by line.
- **Secrets:** never commit keys or `.env*` files (only `.env.example`). Never paste secrets in PRs.
- **No new paid services or dependencies** without Chirag's OK (say why in the PR).
- **Don't change live data** (Supabase, Vercel settings, GitHub settings).

## Conventions
- Next.js 16 (see the note above), React 19, Tailwind 4, Supabase with RLS on every table.
- UI: reuse `src/components/ui.js` (Card, Badge, StatCard, Empty, PageTitle) and existing classes
  (`card`, `btn-primary`, `btn-secondary`, `input`, `label`). Mobile first: test at 375px width.
- Copy: plain, friendly English for 13–15 year olds and their parents. Never promise a feature that
  doesn't work yet; say "coming soon".
- Students are minors: collect the minimum data, never expose one student's data to another.
