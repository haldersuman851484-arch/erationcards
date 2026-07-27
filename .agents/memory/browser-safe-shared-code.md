---
name: Browser-safe shared code
description: Where to put constants/logic shared between the React portal and the API server in this monorepo
---

# Browser-safe shared code

Rule: anything the React portal must import (pricing, card-type lists, labels) goes in a
zero-dependency workspace lib (e.g. `@workspace/pricing`), never in `@workspace/db`.

**Why:** `lib/db`'s index exports a live mysql2 client; importing it from Vite/browser code
breaks the build. The portal deliberately does not depend on `@workspace/db`.

**How to apply:** when a new "both sides need this" constant appears, put it in a zero-dep
lib and keep the dependency direction db → shared lib, portal → shared lib (never portal → db).
