# PVC Ration Card Portal

A web application for ordering PVC ration cards online — customers fill in details, pay via UPI, and operators track/dispatch orders through an admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to dev MySQL (may hang against Hostinger; use the generate+migrate workflow below instead)
- `pnpm --filter @workspace/db run generate` — generate SQL migration files from schema (into `lib/db/migrations/`)
- `pnpm --filter @workspace/scripts run migrate` — apply generated migrations via mysql2 (works with Hostinger)
- Required env: `MYSQL_DATABASE_URL` — MySQL connection string (also accepted as `DATABASE_URL`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MySQL + Drizzle ORM (migrated from PostgreSQL for Hostinger compatibility)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle MySQL schema (source of truth for DB shape)
- `lib/db/drizzle.config.ts` — Drizzle-kit config (reads `MYSQL_DATABASE_URL`)
- `artifacts/api-server/src/` — Express routes, auth, middleware
- `artifacts/api-server/src/app.ts` — serves React static build + `/api` routes
- `artifacts/ration-card-portal/src/` — React + Vite frontend
- `scripts/src/build-for-hostinger.mjs` — production deploy build script

## Architecture decisions

- **DB dialect is MySQL** — switched from PostgreSQL so the app deploys directly to Hostinger hPanel (MySQL-only). All schema files use `mysqlTable`; no `.returning()` anywhere (MySQL doesn't support it).
- **Monorepo, single Node.js process in production** — the Express server serves the pre-built React frontend as static files from `public/` alongside the `/api` routes.
- **`mysql2` is externalized** — kept out of the esbuild bundle so native bindings load correctly; must be present in `node_modules` at the deployment root.
- **Uploads via env var** — `UPLOADS_DIR` controls where payment screenshots land; omitting it defaults to `uploads/` relative to the server binary.
- **JWT auth, no sessions** — `SESSION_SECRET` signs JWTs for both admin and operator tokens (7-day expiry).

## Product

- **Order form** — customers enter personal details and select ration card type; each order gets a unique order number.
- **UPI payment** — QR code + manual UPI ID shown after order; customer uploads a payment screenshot.
- **Admin dashboard** — login-protected view of all orders with status management (pending → confirmed → dispatched).
- **Operator portal** — separate login for field operators to view and update their assigned orders.

## Hostinger Deployment

Build a self-contained deploy package:

```bash
pnpm --filter @workspace/scripts run build-for-hostinger
```

This creates `hostinger/` at the repo root with the bundled server and React build.

**Steps (one-time Hostinger setup):**

1. **Create MySQL DB** in hPanel → Databases → MySQL Databases. Note the host, username, password, and DB name.
2. **Set env vars** in hPanel → Node.js → Your App → Environment Variables (see `.env.example`):
   - `MYSQL_DATABASE_URL` — `mysql://user:pass@localhost:3306/dbname`
   - `SESSION_SECRET` — long random string
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — admin dashboard credentials
   - `MERCHANT_UPI_ID` — UPI ID for the payment QR code
   - `UPLOADS_DIR` — absolute path for payment screenshot storage (e.g. `/home/<user>/uploads`)
3. **Apply schema to production** (run from this Replit repo, once DB URL is set as env var):
   ```bash
   # Step 1 — generate SQL migration files from the schema:
   pnpm --filter @workspace/db run generate

   # Step 2 — apply them via mysql2 (works with Hostinger, bypasses drizzle-kit's client):
   MYSQL_DATABASE_URL="mysql://..." pnpm --filter @workspace/scripts run migrate
   ```
   > **Note:** `drizzle-kit push` may hang due to Hostinger's firewall blocking drizzle-kit's internal MySQL client. The generate+migrate workflow above uses the same `mysql2` driver that the app server uses and is the reliable alternative.
4. **Upload `hostinger/` folder** to your Hostinger Node.js app root (via Git or File Manager).
5. **Install dependencies** via hPanel SSH terminal:
   ```bash
   cd <app-root> && npm install
   ```
6. **Set Node.js startup file** in hPanel to `dist/index.mjs`.
7. **Restart** the Node.js app in hPanel.

**Subsequent deploys:**

```bash
pnpm --filter @workspace/scripts run build-for-hostinger
# then re-upload hostinger/ and restart in hPanel
```

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **No `.returning()` in MySQL** — any new insert/update must do a follow-up `.select()` to get the inserted row.
- **`mysql2` must be installed** at the Hostinger deployment root — it is externalized from the esbuild bundle.
- **`drizzle-kit push` runs from the repo, not `hostinger/`** — the schema lives in `lib/db/src/schema/`, not in the deploy bundle.
- **BASE_PATH not needed in production** — Vite defaults to `/` when `BASE_PATH` env var is absent during build.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
