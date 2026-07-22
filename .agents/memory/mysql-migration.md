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

**Why:** Hostinger hPanel only supports MySQL; production deploy required full dialect switch.

**How to apply:** Any new schema file must use mysql-core imports. Any new route doing insert/update must fetch the result with a follow-up select, not .returning().
