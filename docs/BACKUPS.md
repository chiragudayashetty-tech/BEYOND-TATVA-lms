# Backups and recovery (audit M5)

**Nightly at 02:17 IST**, GitHub Actions (`.github/workflows/nightly-backup.yml`) dumps the database
(`public`, `auth`, `storage` schemas), checks the key tables are in it, **encrypts it (AES-256)** and keeps it
as a workflow artifact for **30 days**. Free. The repo is public, so nothing unencrypted ever leaves the runner.

Uploaded files (since 2026-11-09): a second encrypted artifact `bt-files-<date>` (all Storage buckets via `scripts/backup-storage.mjs`), once Chirag adds GitHub secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; until then the step only warns.
Previously not covered: uploaded files themselves (assignment photos/PDFs in Supabase Storage); only their database
rows. Videos live on YouTube/Bunny. Move to Supabase Pro (daily backups + point-in-time) before scale.

## One-time setup (Chirag, ~5 minutes)
1. **Passphrase:** make a long one (e.g. `openssl rand -base64 32`, or 6+ random words). Save it in your
   password manager **first**: without it the backups can't be opened, by anyone, ever.
2. **Database URL:** Supabase → project → **Connect** → **Session pooler** → copy the URI and put your
   database password in it (Project Settings → Database → reset it if you don't know it).
3. GitHub → `BEYOND-TATVA-lms` → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = the URI from step 2
   - `BACKUP_PASSPHRASE` = the passphrase from step 1
4. GitHub → **Actions → Nightly backup → Run workflow**. It should go green in ~2 minutes and show an
   artifact `bt-db-<date>`. Tell Claude, and Claude checks the log.

## If a backup fails
GitHub emails the repo owner when a scheduled run fails. Open the run: the error says what's missing
(secrets, a table, the connection).

## Restore drill (do once now, then every 3 months)
On any computer with Postgres 17 and gpg (or ask Claude to do it in a cloud session):
1. Actions → latest **Nightly backup** run → download the artifact, unzip → `bt-db-….dump.gpg`.
2. `BACKUP_PASSPHRASE='…' PGHOST=localhost PGUSER=postgres bash scripts/restore-backup.sh bt-db-….dump.gpg`
3. It restores into a **local** throwaway database and prints row counts (profiles, purchases, leads…).
   Compare with Studio. The script refuses to run against a Supabase host.

## Real recovery (data lost or corrupted)
1. Stop writes: Vercel → `beyond-tatva-lms` → pause, or tell users.
2. Create a new Supabase project in ap-south-1 (or use the same one after Supabase support confirms).
3. Decrypt (`gpg -d bt-db-….dump.gpg > db.dump`), then
   `pg_restore --no-owner --no-privileges --clean --if-exists -d "<new project session pooler URI>" db.dump`.
4. Point the LMS env vars (`NEXT_PUBLIC_SUPABASE_URL`, anon key, service role key) at the new project,
   redeploy, re-add the Google OAuth redirect URL and Site URL in Supabase Auth settings.
Claude does steps 2–4 with Chirag; the restore itself takes minutes.

## Recovery targets (agreed 2026-11-09)
- Data loss: at most 24 h (nightly backup). Payments are also in Razorpay, so a lost payment can be re-recorded from there.
- Recovery time: half a day to a new Supabase project (steps above), then update Vercel env vars.
- Restore drill: **not done yet**: Claude + Chirag, one session, before launch (needs `BACKUP_PASSPHRASE`).
