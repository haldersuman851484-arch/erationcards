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
