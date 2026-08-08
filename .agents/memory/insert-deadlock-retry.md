---
name: Concurrent-insert gap-lock deadlocks
description: Simultaneous INSERTs on a table with a unique index can deadlock (errno 1213) even with distinct values; retry like a duplicate key
---

Concurrent INSERTs into a table with a unique secondary index (e.g. order number) can hit **ER_LOCK_DEADLOCK (errno 1213)** even when every inserted value is distinct — InnoDB gap locks on the unique index collide under simultaneous inserts, and one transaction is rolled back. Diagnosed via `SHOW ENGINE INNODB STATUS` → "LATEST DETECTED DEADLOCK" pointing at the unique index.

**Why:** gap/insert-intention locks are taken on index ranges, not just the exact value, so bursts of inserts contend even without real conflicts. The rolled-back insert is safe to reissue.

**How to apply:**
- Treat deadlock like a duplicate-key collision in insert retry loops: detect errno/code 1213 (`ER_LOCK_DEADLOCK`), walk `.cause` chains (drizzle wraps errors), and retry the whole insert with fresh generated values, bounded attempts.
- Order creation does this (shared helpers next to the duplicate-key detector in the orders route). Under test-suite load the retry fires for real — a warning log line marks each occurrence.
- A 500 from a plain insert route that only appears under concurrent load is a hint this class of error is escaping unretried.
