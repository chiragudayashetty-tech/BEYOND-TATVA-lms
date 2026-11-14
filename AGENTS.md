<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Team rules (Claude = lead, Codex = builder, Chirag = owner)

Two AI agents work on this repo. Read this and `docs/PROJECT.md` before every task.

## Roles (changed by Chirag 2026-11-02, second change: Claude builds SQL + backend, Codex builds UI)
- **Chirag (owner):** decides priorities, owns all accounts and secrets. Approves every **live database
  change** ("apply N") and anything touching money, accounts, secrets or paid services.
- **Claude (lead + backend):** architecture; **builds all SQL and backend**: migrations and their tests, RLS,
  RPCs, API routes, auth, server actions and every security-critical file listed below. Reviews **every** Codex PR
  (lint, tests, build, `npm run test:db`), fixes small issues on top or sends it back, **merges**, applies
  migrations to live **only after Chirag's "apply"**, keeps `docs/PROJECT.md` current.
- **Codex (builder, UI):** builds pages and components, one scoped task per PR, on top of the tables, RPCs and
  server actions Claude has already merged.

## Every task
1. **Start from the latest `main`:** `git fetch origin && git checkout -b <agent>/<task> origin/main`.
   Never work from an old copy or a separate folder. Never commit to `main`.
2. Branch names: `claude/<task>` or `codex/<task>`. One task per branch, small PRs.
3. Before opening a PR run: `npm run lint`, `npm test`, `npm run build`
   (and `npm run test:db` when SQL changed). Paste the results in the PR.
4. PR description: what changed, why, how it was tested, what was **not** tested.
5. Claude reviews and merges. Don't merge your own PR. End each PR with "Ready for Claude's review."

## Hard limits for Codex
- **Don't touch** `supabase/**`, `src/proxy.js`, `src/lib/supabase/*`, `src/app/api/**`, `src/app/auth/**`,
  `src/lib/enrollments.js`, `src/app/admin/actions.js`, `vercel.json`, `.github/**`. Never run SQL against Supabase.
  If a UI task needs a table, column, RPC, route or server action that isn't on `main` yet, **stop and describe
  it in the PR**; Claude builds it. Call existing RPCs/actions from the UI as documented in the task.
- **Claude's own SQL rules:** new migration files only (`YYYYMMDDHHMMSS_<what>.sql`), tests in
  `supabase/tests/studio_test.sql`, `npm run test:db` green; RLS on every table, indexes on foreign keys;
  functions `security definer set search_path = ''`, `revoke ... from public, anon`, admin checks via `public.is_admin()`.
- **Secrets:** never commit keys or `.env*` files (only `.env.example`). Never paste secrets in PRs.
- **No new paid services or dependencies** without Chirag's OK (say why in the PR).
- **Don't change live data** (Supabase, Vercel settings, GitHub settings).

## Removed features
Check `docs/PROJECT.md` → "Removed features" before building. Example: the workshop registration system
(tables, `/w/` page, attendance) was removed on 2026-11-14; don't bring it back unless Chirag asks. "Workshop booked/done"
in School outreach is a sales status and stays.

## Conventions
- Next.js 16 (see the note above), React 19, Tailwind 4, Supabase with RLS on every table.
- UI: reuse `src/components/ui.js` (Card, Badge, StatCard, Empty, PageTitle) and existing classes
  (`card`, `btn-primary`, `btn-secondary`, `input`, `label`). Mobile first: test at 375px width.
- Copy: plain, friendly English for 13–15 year olds and their parents. Never promise a feature that
  doesn't work yet; say "coming soon".
- Students are minors: collect the minimum data, never expose one student's data to another.
