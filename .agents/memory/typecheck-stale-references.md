---
name: Typecheck & stale project references
description: How the monorepo guarantees generated lib type declarations can't go stale
---

Packages that use TypeScript project references (web portal, api-server) must typecheck with `tsc -b tsconfig.json`, NOT `tsc -p ... --noEmit`. `tsc -p` reads the referenced libs' emitted `dist/*.d.ts`, which can be stale after codegen/schema changes and cause false "property does not exist" errors; `tsc -b` rebuilds referenced lib outputs first.

**Why:** A typecheck validation once failed on stale `lib/api-client-react/dist` declarations even though src was correct.

**How to apply:** Keep per-package `typecheck` scripts as `tsc -b` for any package with `references`. The codegen command (`pnpm --filter @workspace/api-spec run codegen`) also rebuilds lib dists via `typecheck:libs` after orval runs. If adding a new package that references a lib, give it a `tsc -b` typecheck script. Note: `tsc -b` doesn't accept `--noEmit`; set `"noEmit": true` in the package tsconfig instead (as done for api-server).
