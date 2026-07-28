# PVC Ration Card Portal

A web application for ordering PVC ration cards online — customers fill in details, pay via UPI, and operators track/dispatch orders through an admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (also rebuilds lib type declarations, so generated types are never stale)
- `pnpm --filter @workspace/db run push` — push DB schema changes to dev MySQL (may hang against Hostinger; use the generate+migrate workflow below instead)
- `pnpm --filter @workspace/db run generate` — generate SQL migration files from schema (into `lib/db/migrations/`)
- `pnpm --filter @workspace/scripts run migrate` — apply generated migrations via mysql2 (works with Hostinger)
- `pnpm --filter @workspace/scripts run check-migrations` — scan generated SQL files for destructive operations (DROP COLUMN, enum changes, etc.); exit 1 = blocked, exit 0 = safe
- `pnpm --filter @workspace/scripts run migrate-test-local` — static safety check (generate + check); add `MIGRATION_TEST_DB_URL=mysql://...` for a full apply+verify run against a staging DB
- Required env: `MYSQL_DATABASE_URL` — MySQL connection string (also accepted as `DATABASE_URL`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MySQL + Drizzle ORM (migrated from PostgreSQL for Hostinger compatibility)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `lib/pricing/src/index.ts` — card catalog + pricing matrix (single source of truth shared by portal, API server, and DB schema)
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
- **Order route authorization** — list/detail/stats/recent/status-PATCH/assign require an admin token; order detail and status-PATCH also accept the token of the operator the order is assigned to. Public by design: order creation, `GET /orders/track` (by order number), `GET /orders/:id/tracking`, card-PDF upload.
- **Customer receipt** — public frontend page at `/receipt/:orderNumber` (fed by the public track endpoint) renders the payment receipt; "Download PDF" uses the browser print dialog (print CSS scoped to `#receipt-sheet`, A4), same pattern as the admin shipping label. Maps all six `payment_status` enum values (PAID / pending / failed / refunded) — don't reduce it back to confirmed-only.

## Product

- **Card products & pricing** — two price groups, defined in `@workspace/pricing` (`lib/pricing`):
  - Ration cards (AAY, PHH, SPHH, RKSY-I, RKSY-II): public ₹70 single / ₹50 each for 2+; operator ₹70 single / ₹40 each for 2+.
  - ABHA / E-SHRAM / GENERAL: public ₹100 single / ₹75 each for 2+; operator ₹85 single / ₹70 each for 2+.
  - Mixed orders: the single-vs-multi tier is decided by the TOTAL card count in the order; each card is then billed at its own group's rate for that tier (e.g. public 1 PHH + 1 ABHA = ₹50 + ₹75 = ₹125).
  - The server recomputes the amount on order creation (client-sent `amount` is ignored). To change prices, edit `lib/pricing/src/index.ts` only — forms, receipts, FAQ/SEO copy, and the API all read from it.
  - Exception: `artifacts/ration-card-portal/index.html` (static meta tags + JSON-LD) states prices literally — update it by hand whenever prices change.
- **Order form** — 4-step wizard in both the public (`/order`) and operator flows: Card Details → Delivery (requires a validated Email ID) → Payment (creates the order) → Upload PDF (one e-ration-card PDF per card, Submit enabled only when all are uploaded). Each order gets a unique order number.
- **Card PDF uploads are PDF-only and keep the original filename** — server rejects anything that isn't a real PDF (mimetype + `%PDF` content check; images renamed to `.pdf` are caught). Files are stored under `card-pdfs/<orderNumber>/<cardIndex>/<original-name>` so same-named files never collide, and served via `/api/uploads/card-pdfs/...` with a Content-Disposition carrying the exact original name (UTF-8/Bengali names supported). Old flat `card-pdf-*` files keep working through the legacy `/api/uploads/:filename` route.
- **Order confirmation email** — final Submit calls `POST /api/orders/:orderNumber/submit`, which emails the order number via Resend (`artifacts/api-server/src/lib/email.ts`). Email failure never blocks the order (`emailSent:false` + amber note on the success screen). The endpoint is idempotent: `orders.submitted_at` is claimed atomically, so the email goes out at most once per order no matter how often submit is replayed. The old `/order-upload/:orderNumber` page remains the resume path for incomplete orders (it does not send the email).
- **UPI payment** — QR code + manual UPI ID shown after order; customer uploads a payment screenshot.
- **Admin dashboard** — login-protected view of all orders with status management (pending → confirmed → dispatched).
- **Operator portal** — separate login for field operators to view and update their assigned orders.

## Hostinger Deployment

### One-time Hostinger setup

1. **Create MySQL DB** in hPanel → Databases → MySQL Databases. Note the host, username, password, and DB name.
2. **Set env vars** in hPanel → Node.js → Your App → Environment Variables (see `.env.example`):
   - `MYSQL_DATABASE_URL` — `mysql://user:pass@localhost:3306/dbname`
   - `SESSION_SECRET` — long random string
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — admin dashboard credentials
   - `MERCHANT_UPI_ID` — UPI ID for the payment QR code
   - `UPLOADS_DIR` — absolute path for payment screenshot storage (e.g. `/home/<user>/uploads`)
   - `RESEND_API_KEY` — Resend API key for order confirmation emails (required on Hostinger; the Replit connector proxy is unreachable outside Replit)
   - `EMAIL_FROM` — sender for order emails, e.g. `PVC Card Portal <orders@erationcards.in>` (only works after the domain is verified in Resend; defaults to `onboarding@resend.dev`)
3. **Set Node.js startup file** in hPanel to `dist/index.mjs`.

### Deploying (first time & every update)

Run this single command from the repo root (with your production DB URL):

```bash
MYSQL_DATABASE_URL="mysql://user:pass@host:3306/db" \
  pnpm --filter @workspace/scripts run deploy-for-hostinger
```

This does everything automatically:
- Generates SQL migration files from the current schema
- Builds the React frontend + API server bundle → `hostinger/`
- Applies migrations to the production MySQL database

Then finish the deploy manually on Hostinger:

```bash
# 1. Upload the hostinger/ folder (File Manager or Git pull on the server)
# 2. In hPanel SSH terminal:
cd <app-root> && npm install
# 3. Restart the Node.js app in hPanel
```

> **Note:** `drizzle-kit push` may hang due to Hostinger's firewall. The deploy script
> uses `mysql2` directly (same driver as the app) so migrations apply reliably.

### If you only want the build (no migration)

```bash
pnpm --filter @workspace/scripts run build-for-hostinger
```

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **No `.returning()` in MySQL** — any new insert/update must do a follow-up `.select()` to get the inserted row.
- **Resend email sandbox** — until `erationcards.in` is verified at resend.com/domains, Resend only delivers to the Resend account owner's own inbox and the `from` must stay `onboarding@resend.dev`; other recipients get a 403 (handled: order still completes, `emailSent:false`). `email.ts` picks its transport automatically: direct Resend API when `RESEND_API_KEY` is set (Hostinger), otherwise the Replit-managed Resend connector (dev).
- **`mysql2` must be installed** at the Hostinger deployment root — it is externalized from the esbuild bundle.
- **`drizzle-kit push` runs from the repo, not `hostinger/`** — the schema lives in `lib/db/src/schema/`, not in the deploy bundle.
- **BASE_PATH not needed in production** — Vite defaults to `/` when `BASE_PATH` env var is absent during build.
- **`drizzle.config.ts` must use relative paths for `schema` and `out`** — drizzle-kit v0.31.10 prepends `./` to absolute paths internally, producing a double-slash (`'.//abs/path'`) that breaks re-runs. Keep them as `"./src/schema/index.ts"` and `"./migrations"` (relative to the config file's own directory).
- **Never run `migrate-test-local` with `MYSQL_DATABASE_URL` set to production** — use `MIGRATION_TEST_DB_URL` pointing at a throwaway staging DB. The script deliberately ignores `MYSQL_DATABASE_URL` to prevent accidental runs against live data.
- **`drizzle-kit push` hangs on Hostinger** — Hostinger's firewall blocks the drizzle-kit introspection connection. When a schema column is added to `lib/db/src/schema/orders.ts`, apply it manually with a Node.js script that uses `mysql2` directly (the same driver as the app). Example one-liner from the workspace root:
  ```bash
  cd artifacts/api-server && node --input-type=module << 'EOF'
  import mysql from "/home/runner/workspace/node_modules/.pnpm/mysql2@3.23.1_@types+node@25.9.4/node_modules/mysql2/promise.js";
  const conn = await mysql.createConnection({ uri: process.env.MYSQL_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await conn.query("ALTER TABLE orders ADD COLUMN my_new_column TEXT");
  console.log("Done"); await conn.end();
  EOF
  ```

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
