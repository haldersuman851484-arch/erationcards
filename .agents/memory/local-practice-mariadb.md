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
