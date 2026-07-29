---
name: Staff-login e2e credentials
description: How to hand env-based login credentials to the Playwright testing subagent without leaking them
---

The staff logins (admin + processing) have no seedable test accounts — the only valid credentials live in env vars (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, `PROCESSING_EMAIL`/`PROCESSING_PASSWORD`).

**Rule:** never paste passwords into a subagent task text. Instead tell the testing subagent to read the env var by NAME via shell ("fill the password field with the value of $PROCESSING_PASSWORD; never print it in your report"). The tester shares the workspace environment, so this works and it kept secrets out of task text, reports, and screenshots.

**How to apply:** any e2e plan that needs a staff login on this project — reference the env var names, add the "never print" instruction, and note the two staff roles share one email (password decides the role).
