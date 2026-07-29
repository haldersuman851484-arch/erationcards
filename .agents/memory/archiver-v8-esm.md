---
name: archiver v8 is pure ESM
description: archiver >=8 has no default/callable export; use named ZipArchive class and matching @types
---

# archiver v8 is pure ESM with named exports

**Rule:** `archiver@8+` exports named classes only — `import { ZipArchive } from "archiver"` then `new ZipArchive({ zlib: { level: 6 } })`. There is NO default export and NO callable `archiver("zip", …)` factory anymore. Use `@types/archiver@8` (its named-class shape is correct, not broken).

**Why:** Wasted a full debug cycle: `@types/archiver@8` looked "broken" for the classic default import, so types were pinned to v6 (`export =` style). tsc then accepted `import archiver from "archiver"` — but at runtime the default is `undefined`. Under vitest/vite-node this surfaced as `.default is not a function` and, worse, as 16 test FILES failing at collection because app.ts transitively imports the route (module-level throw). Node/esbuild would have failed the same way in production.

**How to apply:** When a CJS-era package majors to pure ESM, a "broken" @types package matching that major usually means the API shape changed — read `node_modules/<pkg>/index.js` before downgrading types. If a default import typechecks only with older types, that's the smell.
