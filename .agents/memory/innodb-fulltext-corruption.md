---
name: InnoDB FULLTEXT silent corruption
description: FULLTEXT index can be half-broken after a hard kill — index exists but MATCH misses rows; how to detect and repair
---

InnoDB FULLTEXT indexes can be **silently half-corrupt** after a hard server kill (e.g. merge-day restart of the practice MariaDB, or a crash on Hostinger prod): `SHOW INDEX` lists the index, queries do not error, but `MATCH ... AGAINST` misses rows that a `LIKE` scan finds (observed: LIKE found 58 rows, MATCH only 29 → admin search "randomly" returned nothing).

**Why:** InnoDB FTS maintains its own auxiliary tables; a hard kill can lose part of the FTS cache/sync without marking the index invalid. Existence checks pass, health is broken.

**How to apply:**
- Symptom to recognize: search endpoints returning `[]` for data that plainly exists, while LIKE-based fallbacks or direct row reads work.
- Fix: `ALTER TABLE <t> DROP INDEX <ft_idx>; ALTER TABLE <t> ADD FULLTEXT <ft_idx> (...cols);` — cheap on small/medium tables, fully rebuilds the FTS aux tables.
- The api-server boot self-heal (`ensureSearchIndexes`) only checks the index EXISTS — it will not catch this. If "search is empty" reports come from production after a crash/restart, run the drop/re-add before debugging application code. Candidate improvement: probe health at boot by comparing a MATCH count vs a LIKE count on a sampled term.
- Confirmed to recur on every unclean shutdown so far (2/2 hard kills → corrupt FT index, existence check still green). Treat any crash-recovered MariaDB as "FT index broken until a MATCH probe proves otherwise"; symptom signature = search/FULLTEXT tests return `[]` while all other suites pass.
