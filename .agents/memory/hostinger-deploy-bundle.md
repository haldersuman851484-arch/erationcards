---
name: Hostinger deploy bundle
description: Rules for producing a working self-hosted (Hostinger) zip of the api-server + portal
---

# Hostinger deploy bundle

**Rule 1 — externals must ship.** The api-server esbuild config force-externalizes big/native packages (`@google-cloud/*`, `mysql2`, …). Every one of those that the server actually imports at runtime MUST be listed in the dependencies of the package.json that the Hostinger build script generates, or the bundle dies at boot with `ERR_MODULE_NOT_FOUND` on the host.
**Why:** hit exactly this with `@google-cloud/storage` — build succeeded, zip looked fine, server crashed on first start.

**Rule 2 — storage is dual-backend.** `PRIVATE_OBJECT_DIR` set → Replit object storage (GCS through the local credential sidecar; only works on Replit). Unset → local disk under `UPLOADS_DIR` (default `<cwd>/uploads`). Same keys both sides (`card-pdfs/ORD/0/x.pdf`). Disk serving infers content-type from the file extension (GCS remembers the upload's type instead).
**How to apply:** never "fix" the disk branch by requiring Replit env vars off-platform, and keep both branches' return semantics identical — callers rely on `false`/`"missing"` rather than throws for absent files. The disk branch must reject symlinked path components (lstat walk) — a link planted in the uploads dir can otherwise redirect reads/writes/deletes outside the root.

**Rule 3 — boot-test the bundle before shipping.** After building `hostinger/`: `npm install` inside it, run `env -u PRIVATE_OBJECT_DIR -u DEFAULT_OBJECT_STORAGE_BUCKET_ID -u PUBLIC_OBJECT_SEARCH_PATHS NODE_ENV=production PORT=<spare> node dist/index.mjs`, then check `/` (200, zero `%%PRICE_` tokens), a made-up path (404), and an `/api/uploads/<file>` round-trip from `uploads/`. Remove `node_modules`, `package-lock.json`, `boot.log` and any test upload BEFORE zipping.

**Rule 4 — zip layout.** Zip the CONTENTS of `hostinger/` (`cd hostinger && zip -r ../x.zip .`) so `package.json` sits at the zip root — Hostinger's Node.js app detection needs that; a nested top-level folder breaks it.

## Hostinger live-launch operational notes (learned walking the user through hPanel, July 2026)
- "Deployment failed" with a clean npm-install log = app crashed at start. No env vars → boot crash (reproduced locally with `env -i`). With the SEVEN required vars (NODE_ENV, MYSQL_DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, MERCHANT_UPI_ID, PORT) the app boots and serves prerendered pages even when the DB is unreachable — mysql2 pool is lazy — so deploy goes green before DB setup. Delhivery/Resend/staff vars are optional at boot (dispatch 503s until configured).
- **hPanel does NOT inject PORT** for zip-uploaded Node apps, despite its Express doc claiming "Hostinger assigns a port at runtime" — the app crash-looped on the PORT guard while the deployment showed green "Completed". Fix: user-set env var `PORT=3000` (matches Hostinger's own Express example fallback `process.env.PORT ?? 3000`). Green deploy ≠ running app: 503 with `server: hcdn` header = app down behind the edge; the Runtime logs page (left menu) shows the real boot stack trace.
- hPanel paths: site Dashboard → "Settings & Redeploy" reopens the deploy flow with the last zip pre-selected (no re-upload); the Entry file field defaults to `server.js` and MUST point at the real start file (`dist/index.mjs` — the bundle ships no server.js); left menu has dedicated "Environment variables" and "Runtime logs"; after env edits press Apply changes then Redeploy (don't trust auto-redeploy claims — confirm a new build appears on Deployments).
- Loading live tables remotely: user creates a Remote MySQL entry (Databases → Remote MySQL → pick DB → tick Any Host → Create; host `srvNNNN.hstgr.io`), then `cd lib/db && MYSQL_DATABASE_URL='mysql://user:pass@srvNNNN.hstgr.io:3306/db' pnpm run push-force` (plain `push` prompts interactively). ER_ACCESS_DENIED until the entry exists. No seed rows needed — pricing/contact/UPI fall back to code defaults (@workspace/pricing, @workspace/contact, MERCHANT_UPI_ID env). Delete the Remote MySQL entry afterwards.
- MySQL: create under Databases → Management (name/user/password). App connects with host `localhost` per Hostinger's Node.js+MySQL guide — the `srvNNNN.hstgr.io` host on the Remote MySQL page is for outside connections only. Advise letters/numbers-only DB password so the mysql:// URL needs no percent-encoding.
