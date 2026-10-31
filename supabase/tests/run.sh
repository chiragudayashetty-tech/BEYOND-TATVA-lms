#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres database and runs the SQL tests.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=bt_test_$$
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "create database $DB" >/dev/null
trap '$P -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
$P -d "$DB" -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do $P -d "$DB" -1 -f "$f"; done
out=$($P -d "$DB" -t -A -F ' | ' -f supabase/tests/payments_test.sql 2>&1)
echo "$out" | grep -E '^T[0-9]+|NOTICE' | sed 's/^psql:[^ ]* //'
if echo "$out" | grep -qE '^T[0-9]+[a-z]? .* \| f$|FAIL|ERROR'; then echo "SQL TESTS FAILED"; exit 1; fi
echo "All SQL tests passed"
