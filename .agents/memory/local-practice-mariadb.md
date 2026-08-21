---
name: Local practice MariaDB for journey tests
description: Development-only MariaDB boot pattern for reliable local testing
---

## Rule

Use the throwaway local MariaDB workflow for development testing. It must provision the development database and app account, apply migrations, and publish readiness before the API starts. Use MariaDB rather than MySQL 8, and use the tracked migration runner rather than schema push.

**Why:** Production uses MariaDB, while the schema depends on MariaDB-compatible behavior. Ensuring migrations finish before API boot prevents fresh-database schema drift and lets journey tests run without remote-database access.

**How to apply:** To deliberately reset development test data, stop the local database workflow, delete its gitignored data directory, and start it again. If a tracked migration fails, fix its journal entry or SQL statement boundaries; do not bypass it with manual schema changes.

