---
name: MySQL migration
description: Lessons from migrating drizzle-orm from PostgreSQL to MySQL for Hostinger deployment
---

# MySQL migration decisions

## Rules

1. **No `.returning()` in MySQL** — replace every `.insert().returning()` / `.update().returning()` with a separate `.select()` afterwards using a known unique key (orderNumber for orders, email for operators, id for updates).

2. **Dual drizzle-orm instance** — pnpm creates separate drizzle-orm instances when packages have different peer deps. Fix: add `mysql2` to every package that directly imports from `drizzle-orm` (api-server needs it alongside db).

3. **MySQL-compatible SQL** — `ilike` → `like` (case-insensitive by default in utf8mb4), `count(*) filter (where ...)` → `sum(case when ... then 1 else 0 end)`, `amount::numeric` cast → `amount` (already decimal).

4. **Schema changes** — `pgTable/pgEnum/serial/numeric/jsonb` → `mysqlTable/mysqlEnum (inline on column)/int().autoincrement()/decimal/json`. `timestamp({ withTimezone: true })` → `timestamp()` (MySQL always UTC).

5. **Raw-SQL-only DDL drifts** — drizzle-orm has no `fulltext()` builder for MySQL, so FULLTEXT indexes live only in raw migration SQL (0002); `drizzle-kit push` and schema dumps silently skip them, and `MATCH…AGAINST` then throws error 1191 at runtime (bit the live launch DB). api-server's boot `ensureSearchIndexes.ts` self-heals the known orders indexes — extend it whenever adding another raw-SQL index.

**Why:** Hostinger hPanel only supports MySQL; production deploy required full dialect switch.

**How to apply:** Any new schema file must use mysql-core imports. Any new route doing insert/update must fetch the result with a follow-up select, not .returning().

## External DB IP allowlist (July 31, 2026)
Hostinger remote MySQL can reject the workspace with ER_ACCESS_DENIED_ERROR when the workspace's egress IP changes (remote-access allowlist is per-IP). When the whole API test suite fails with access denied on every query, verify with a bare mysql2 connection first (`curl ifconfig.me` for current egress IP) — it's an environment issue, not a code regression.

**Remedy (user-side):** hPanel → Databases → Remote MySQL → pick the erationcards database (shows truncated as "u394996455_ration…"; app DB is u394996455_rationcards, user u394996455_erationcards) → add the workspace's current egress IP or tick "Any host (%)". Until it takes effect, the dev preview's API also 500s on every DB route — so this breaks more than validation.

**Jul 31 2026 escalation:** user added both the exact IP and "%", then removed the IP row leaving only "%" — STILL ER_ACCESS_DENIED_ERROR 35+ min later on a bare mysql2 SELECT 1. So hPanel rows existing ≠ working grants; Hostinger-side sync can silently fail. Live site unaffected (connects server-side, not via remote allowlist). If this blocks task validation: verify with the bare probe, then complete with an audited skip_validation_reason and tell the user to delete & re-add the entry later or contact Hostinger support; retest at next task.

## Family-card search via JSON_SEARCH (Aug 2026)
Orders list search (rationCardSearch/quickSearch) also matches family members via
`JSON_SEARCH(family_cards, 'one', '<term>%', NULL, '$[*].rationCardNumber') IS NOT NULL`
(the search-string arg supports % wildcards → prefix semantics). The dev box cannot
reach Hostinger MySQL, so this expression shipped verified only by architect review +
mocked Playwright tests — never smoke-tested against the live server. If family-number
search misbehaves in production, test that expression first in phpMyAdmin.
