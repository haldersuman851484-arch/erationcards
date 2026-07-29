#!/usr/bin/env node
/**
 * deploy-for-hostinger.mjs
 *
 * Single-command Hostinger deploy prep:
 *   1. Verify MYSQL_DATABASE_URL is set (hard-fail if not)
 *   2. Generate SQL migration files from the current schema
 *   3. Build the React frontend + API server bundle → hostinger/
 *   4. Apply generated migrations to the target MySQL database
 *   5. Print the manual upload + restart checklist
 *
 * Usage (from repo root):
 *   MYSQL_DATABASE_URL="mysql://user:pass@host:3306/db" \
 *     pnpm --filter @workspace/scripts run deploy-for-hostinger
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scriptsDir = path.resolve(__dirname, "..");

const run = (cmd, cwd = repoRoot) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd });
};

// ── 0. Guard: MYSQL_DATABASE_URL must be set ───────────────────────────────
if (!process.env.MYSQL_DATABASE_URL) {
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  ERROR: MYSQL_DATABASE_URL is not set.                              ║
║                                                                      ║
║  The migration step requires a live MySQL connection.               ║
║  Set the variable and re-run:                                       ║
║                                                                      ║
║    MYSQL_DATABASE_URL="mysql://user:pass@host:3306/db" \\           ║
║      pnpm --filter @workspace/scripts run deploy-for-hostinger      ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

console.log("=== Hostinger full deploy prep ===\n");

// ── 1. Generate SQL migration files from current schema ───────────────────
console.log("Step 1/4 — Generating migration files from schema…");
run("pnpm --filter @workspace/db run generate");

// ── 2. Build frontend + server bundle → hostinger/ ────────────────────────
console.log("\nStep 2/4 — Building deploy bundle (frontend + server)…");
run("node ./src/build-for-hostinger.mjs", scriptsDir);

// ── 3. Apply migrations to the target MySQL database ──────────────────────
console.log("\nStep 3/4 — Applying migrations to MySQL…");
run("tsx ./src/migrate.ts", scriptsDir);

// ── 4. Ping IndexNow so Bing (and ChatGPT search) re-crawls right away ────
// Best-effort: the script logs failures itself and always exits 0, and even
// so we guard with try/catch — a failed ping must never break a deploy.
console.log("\nStep 4/4 — Submitting sitemap URLs to IndexNow…");
try {
  run("node ./src/submit-indexnow.mjs", scriptsDir);
} catch (err) {
  console.warn(`⚠ IndexNow step failed (deploy unaffected): ${err?.message ?? err}`);
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  All done!  Schema is up to date and hostinger/ is ready to upload. ║
╠══════════════════════════════════════════════════════════════════════╣
║  Remaining manual steps on Hostinger:                               ║
║                                                                      ║
║  1. Upload the hostinger/ folder to your Hostinger Node.js app      ║
║     (File Manager or Git → pull)                                    ║
║                                                                      ║
║  2. In hPanel SSH terminal:                                         ║
║       cd <app-root> && npm install                                  ║
║                                                                      ║
║  3. Restart the Node.js app in hPanel                               ║
║                                                                      ║
║  4. Verify Google sees the live prices (no leftover tokens):        ║
║       curl -s https://erationcards.in/ | grep -c '%%PRICE_'  → 0    ║
║     or run the full smoke test:                                     ║
║       API_BASE_URL=https://erationcards.in/api \\                   ║
║         pnpm --filter @workspace/scripts run smoke-test             ║
║                                                                      ║
║  That's it — your app is live!                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`);
