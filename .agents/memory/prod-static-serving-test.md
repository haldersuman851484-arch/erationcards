---
name: Testing production static serving locally
description: How to live-test the API server's production static/caching behavior from the dev workspace, and the in-memory HTML cache gotcha
---

# Testing production static serving locally

The API server only serves the built frontend in production (its `publicDir` is `<api-server>/public`, which doesn't exist in dev — the Hostinger build script stages the React build there as `hostinger/public/`).

**To live-test prod serving/caching without deploying:** build the portal, `cp -r` its `dist/public` to `artifacts/api-server/public`, **restart the API workflow**, then curl the internal port (8080). `express.static` picks up plain files per-request, but the prerendered snapshot route→file map is built ONCE at boot — without a restart after staging, SPA routes silently serve the shell `index.html` (head tokens substituted, so ₹ digits appear and it looks half-right; the giveaway is missing FAQPage JSON-LD). Check `/assets/*` headers, `/robots.txt`, and a snapshot route for price-token injection + JSON-LD.

**Gotcha:** the SPA fallback caches `index.html` **in memory** after the first request. After deleting the staged `public/` dir, the running instance keeps serving the cached HTML on non-API routes — restart the API workflow to return to clean dev 404 behavior. Also delete `artifacts/ration-card-portal/dist` so git stays clean.

**Why:** refresh-speed/caching work can only be validated against the production serving path; this avoids a full Hostinger deploy cycle.
