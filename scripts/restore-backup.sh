#!/usr/bin/env bash
# Restore drill: decrypts a nightly backup and restores it into a LOCAL throwaway Postgres 17 database,
# then prints row counts. Never point this at the live Supabase database.
# Usage: BACKUP_PASSPHRASE=... PGHOST=localhost PGUSER=postgres bash scripts/restore-backup.sh bt-db-XXXX.dump.gpg
set -euo pipefail
f=${1:?give the .dump.gpg file}
: "${BACKUP_PASSPHRASE:?set BACKUP_PASSPHRASE}"
case "${PGHOST:-localhost}" in *supabase*) echo "Refusing: PGHOST looks like Supabase. Restore drills run locally only."; exit 1;; esac
DB=bt_restore_$(date +%s)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt --output "$tmp/db.dump" "$f" 3<<<"$BACKUP_PASSPHRASE"
psql -q -d postgres -c "create database $DB"
# Supabase roles the dump may mention.
for r in anon authenticated service_role supabase_admin supabase_auth_admin supabase_storage_admin authenticator; do
  psql -q -d "$DB" -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='$r') then create role $r nologin; end if; end \$\$;"
done
pg_restore --no-owner --no-privileges -d "$DB" "$tmp/db.dump" 2> "$tmp/restore.log" || true
echo "Restore warnings (Supabase-only extensions are expected): $(grep -c 'error' "$tmp/restore.log" || true)"
psql -d "$DB" -c "select 'profiles' t, count(*) from public.profiles union all select 'course_access', count(*) from public.course_access
  union all select 'purchases', count(*) from public.purchases union all select 'leads', count(*) from public.leads
  union all select 'lesson_progress', count(*) from public.lesson_progress union all select 'auth.users', count(*) from auth.users"
echo "Restored into local database $DB. Drop it when done: psql -d postgres -c 'drop database $DB'"
