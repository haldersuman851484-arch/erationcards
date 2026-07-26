---
name: Typecheck & stale project references
description: Why typecheck can false-fail on stale lib dist output and how validation avoids it
---

The web portal and api-server use TypeScript project references to `lib/api-client-react` and `lib/api-zod`. Their `typecheck` scripts run `tsc -p` (no build), so they read the libs' *emitted* `dist/*.d.ts`, which can be stale after codegen/schema changes — causing false type errors that don't exist in the libs' `src`.

**Why:** A registered `typecheck` validation initially failed with "property does not exist" errors that were only in the stale `lib/api-client-react/dist` declarations; the src was correct.

**How to apply:** The `typecheck` validation command runs `npx tsc -b lib/api-client-react lib/api-zod` first to rebuild reference outputs, then the package typechecks. Keep that ordering if the command changes; if a typecheck error mentions a generated type missing a field, rebuild the lib references before debugging app code.
