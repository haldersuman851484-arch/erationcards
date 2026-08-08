---
name: Endpoint-removal sweep
description: Checklist of non-obvious places that break when an API route is removed in this monorepo
---

Removing an API endpoint is never just the route file + openapi path. The typechecker misses several spots; each bit below actually broke during the manual-payment-verification removal (Aug 2026).

**The rule:** when deleting a route, sweep ALL of these before running codegen or tests:

1. **openapi.yaml — paths AND component schemas.** A path block can survive an "I removed it" edit (search by operationId to confirm). Orval validates `$ref`s first: any dangling reference (`INVALID_REFERENCE`) makes it FAIL **after already cleaning the output folders**, leaving `lib/api-client-react` / `lib/api-zod` generated dirs empty until the spec is fixed and codegen reruns. Unused leftover schemas don't fail codegen but generate dead types — remove them too.
2. **Hand-written barrel files:** `lib/api-zod/src/index.ts` (and check `lib/api-client-react/src/index.ts`) re-export generated type names explicitly. Codegen won't touch them; stale names = TS2307/TS2724 after regen.
3. **Auth-matrix spec:** `api-server/src/routes/processing-auth.test.ts` `ADMIN_ONLY_ENDPOINTS` lists every admin route as strings; removed routes 404 and fail both the 403 and 401 loop assertions (2 failures per stale entry).
4. **Deploy smoke test:** `scripts/src/smoke-test.ts` calls routes as string paths — invisible to tsc. Convert a removed-endpoint step into a negative assertion (expect 404) instead of deleting it: it then guards that old builds aren't running.
5. **SPA route list:** `api-server/src/lib/clientRoutes.ts` must mirror the portal router exactly — `clientRoutes.test.ts` diffs it against `App.tsx`. Adding a portal page (e.g. `/pay/:orderNumber`) without updating it means prod static serving 404s that page.

**Why:** route surfaces here live in five places that only tests connect; the compiler alone proves nothing about string-routed callers.

**How to apply:** before declaring an endpoint removed, `rg` the operationId, the literal path, and every schema name across `lib/`, `scripts/`, and both artifact `src/` + test trees; then codegen, then the full unit suite (env baseline: integration/collision files always fail on this box — remote MySQL rejects it).
