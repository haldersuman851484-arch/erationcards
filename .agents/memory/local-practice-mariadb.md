---
name: Local practice MariaDB for journey tests
description: Throwaway local DB pattern when Hostinger remote MySQL rejects the dev box; gotchas that made it work
---
Pattern: `scripts/local-mysql.sh` (kept in repo, mariadb Nix pkg kept installed) runs a throwaway MariaDB on 127.0.0.1:3311, data in gitignored `.local-mysql/`. Rebuild in ~10 min: configure workflow `local-mysql` → via socket create a practice db + user (mint fresh throwaway credentials each time; never record or reuse them) → run scripts migrate with MYSQL_DATABASE_URL inline → set **development env var** MYSQL_DATABASE_URL → restart api-server → hand-apply journal-orphaned columns (below) → restart api-server again for boot self-heal.

**Why:** Hostinger's Remote MySQL allowlist silently loses grants (Jul 31 + Aug 8, 2026, both with `%` AND the IP rows visible in hPanel) — error 1045 storms from the dev box while live stays fine. Journey testing can't wait on their support.

Hard-won specifics:
- Must be **MariaDB, not MySQL 8**: live Hostinger is MariaDB; the schema uses UNIQUE keys on TEXT columns which MySQL 8 rejects (ER_BLOB_KEY_WITHOUT_LENGTH at migration 0000).
- A **development env var beats the same-named secret** for workflows — that's how the api-server was repointed without touching secrets.
- Orphaned daemons survive package-swap workflow reboots: the old mysqld kept the socket and answered as 8.0.42. Kill with `pkill -9 -f 'bin/mysqld'` — pattern MUST NOT be plain `mysqld`, which also matches mariadbd's `--pid-file=...mysqld.pid` argument.
- Fresh-DB schema drift: migrations journal omits 0003/0005 (files exist, unregistered → drizzle migrate skips them; apply their ALTERs by hand), `cf_order_id` exists only via api-server boot self-heal (ensureCashfreeColumns), FULLTEXT + created_at idx via ensureSearchIndexes. Self-heals no-op silently if they boot before tables exist — restart the server after migrating.
- `drizzle-kit push` cannot sync a local DB: drizzle.config.ts hard-codes `ssl` in dbCredentials → HANDSHAKE_NO_SSL_SUPPORT, and it fails near-silently (exit 1 mid "Pulling schema", or swallowed entirely). migrate.ts now skips ssl for localhost hosts.
- Cashfree sandbox is fully journey-testable: testing agent paid via UPI VPA `testsuccess@gocash`; GET /payments/cashfree/status is the dev sync path (no webhook in dev).

**How to apply:** dev testing only; afterwards delete the workflow, the development env var, and `.local-mysql/` (script + package stay). Restarting api-server then points back at Hostinger and will 500 on DB routes until their allowlist actually works.

## Strict mode exposes stale test seeds (2026-08-08)
First full test-api run against the practice DB failed 12 specs — none were real app bugs:
- Integration specs seeded pre-migration enum values hidden behind `as any` casts (e.g. orders.payment_status 'verified', which left the enum long ago). MariaDB strict mode hard-errors with WARN_DATA_TRUNCATED where permissive MySQL sql_modes may silently truncate. Treat WARN_DATA_TRUNCATED in tests as stale seed data, not DB breakage.
- Auth specs minted operator tokens for made-up ids; operator auth now verifies the row exists (terminated-account hardening), so such tokens 401. Integration tests must seed real operator rows and clean them up.
Both fixed; test-api is green against the practice DB, so full validation (typecheck + test-api + browser-tests) now runs locally.

## Schema drift after merges (Aug 2026)
Merged tasks can add columns to `lib/db` schema that the local 3311 practice DB never received — test-api then explodes with `Unknown column ... in 'INSERT INTO'` across many files. `pnpm --filter @workspace/db push-force` (drizzle-kit push) FAILS SILENTLY against this MariaDB ("Pulling schema..." then exit 1, no error). Fix: apply the missing columns with a manual `ALTER TABLE` via the mariadb client using $MYSQL_DATABASE_URL. Also: the 3 processing-password login tests need ADMIN_EMAIL/ADMIN_PASSWORD env vars and fail on this box regardless — pre-existing, not schema drift.
