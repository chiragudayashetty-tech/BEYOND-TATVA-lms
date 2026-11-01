<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Team rules (Claude = lead, Codex = builder, Chirag = owner)

Two AI agents work on this repo. Read this and `docs/PROJECT.md` before every task.

## Roles
- **Chirag (owner):** decides priorities, merges PRs, owns all accounts and secrets.
- **Claude (lead):** architecture, database and migrations, security (RLS, auth, payments, enrollments),
  reviews every PR before Chirag merges, keeps `docs/PROJECT.md` current.
- **Codex (builder):** takes one scoped task at a time from the backlog in `docs/PROJECT.md`
  (mostly UI, pages, copy, polish) and delivers it as a small PR.

## Every task
1. **Start from the latest `main`:** `git fetch origin && git checkout -b <agent>/<task> origin/main`.
   Never work from an old copy or a separate folder. Never commit to `main`.
2. Branch names: `claude/<task>` or `codex/<task>`. One task per branch, small PRs.
3. Before opening a PR run: `npm run lint`, `npm test`, `npm run build`
   (and `npm run test:db` when SQL changed). Paste the results in the PR.
4. PR description: what changed, why, how it was tested, what was **not** tested.
5. Claude reviews; Chirag merges. Don't merge your own PR.

## Hard limits for Codex (ask the lead instead)
- **Database:** don't create or edit files in `supabase/migrations/` and never run SQL against Supabase.
  If a task needs a table or column, describe it in the PR and Claude writes the migration.
- **Security-critical files**, no edits without lead approval: `src/proxy.js`, `src/lib/supabase/*`,
  `src/app/api/**`, `src/app/auth/**`, `src/lib/enrollments.js`, `src/app/admin/actions.js`, `vercel.json`.
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
