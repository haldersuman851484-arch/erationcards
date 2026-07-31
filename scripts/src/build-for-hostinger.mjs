#!/usr/bin/env node
/**
 * build-for-hostinger.mjs
 *
 * Produces a self-contained deployment folder at <repo-root>/hostinger/
 * that can be uploaded to Hostinger Node.js hosting as-is.
 *
 * Usage (from repo root):
 *   pnpm --filter @workspace/scripts run build-for-hostinger
 */

import { execSync } from "node:child_process";
import { builtinModules } from "node:module";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const run = (cmd, cwd = repoRoot) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd });
};

const DEPLOY_DIR = path.join(repoRoot, "hostinger");
const MIGRATIONS_DIR = path.join(repoRoot, "lib", "db", "migrations");

console.log("=== Hostinger deployment build ===\n");

// ── 0. Migration freshness check ──────────────────────────────────────────
// Detect schema drift: run drizzle-kit generate (no real DB needed — it only
// reads TypeScript schema files) and check whether it produces new SQL.
// If it does, the developer has uncommitted schema changes and the build is
// aborted before any artifact is produced.
//
// We snapshot the ENTIRE migrations/ directory (both .sql files and meta/)
// before running generate, then fully restore it afterwards — so neither a
// pass nor a fail leaves stray or modified files in git.
console.log("▶ Checking for uncommitted schema changes…");

/** Recursively collect every file under a directory as {relPath, content} */
function snapshotDir(dir, base = dir) {
  const snapshot = new Map();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (entry.isDirectory()) {
      for (const [k, v] of snapshotDir(full, base)) snapshot.set(k, v);
    } else {
      snapshot.set(rel, readFileSync(full));
    }
  }
  return snapshot;
}

/** Restore migrations/ to exactly the state captured in `before`. */
function restoreMigrationsDir(before) {
  // Remove any files that didn't exist before
  const after = snapshotDir(MIGRATIONS_DIR);
  for (const rel of after.keys()) {
    if (!before.has(rel)) {
      rmSync(path.join(MIGRATIONS_DIR, rel));
    }
  }
  // Restore any files that were modified
  for (const [rel, content] of before) {
    const current = after.get(rel);
    if (!current || !current.equals(content)) {
      writeFileSync(path.join(MIGRATIONS_DIR, rel), content);
    }
  }
}

const migrationsBefore = snapshotDir(MIGRATIONS_DIR);

try {
  execSync("pnpm --filter @workspace/db run generate", {
    stdio: "pipe",
    cwd: repoRoot,
    env: {
      ...process.env,
      MYSQL_DATABASE_URL:
        process.env.MYSQL_DATABASE_URL ||
        "mysql://placeholder:x@localhost:3306/placeholder",
    },
  });
} catch (err) {
  restoreMigrationsDir(migrationsBefore);
  console.error("\n❌  drizzle-kit generate failed during migration freshness check.");
  console.error(err.stderr?.toString() ?? err.message);
  process.exit(1);
}

// Detect new .sql files (the canonical signal that schema is ahead of migrations)
const migrationsAfter = snapshotDir(MIGRATIONS_DIR);
const newSqlFiles = [...migrationsAfter.keys()].filter(
  (rel) => rel.endsWith(".sql") && !migrationsBefore.has(rel)
);

// Always restore migrations/ to the pre-generate state so git stays clean
restoreMigrationsDir(migrationsBefore);

if (newSqlFiles.length > 0) {
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  ERROR: Schema has uncommitted migrations — build aborted.          ║
╠══════════════════════════════════════════════════════════════════════╣
║  drizzle-kit generate produced ${newSqlFiles.length} new SQL file(s).              ║
║  lib/db/src/schema/ is ahead of lib/db/migrations/, so the          ║
║  production database will be missing columns and fail at runtime.   ║
║                                                                      ║
║  Fix before deploying:                                              ║
║    1.  pnpm --filter @workspace/db run generate                     ║
║    2.  git add lib/db/migrations/ && git commit                     ║
║    3.  Re-run the build.                                            ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// ── 0b. Secondary rename-drift check ──────────────────────────────────────
// drizzle-kit generate silently exits 0 for column renames in non-interactive
// (pipe) mode — it needs user confirmation to distinguish rename from drop+add.
// This secondary check catches that gap by comparing column names in the latest
// committed drizzle meta snapshot against the current TypeScript schema output
// (via `drizzle-kit export`).  Any column present in the snapshot but absent
// from the export — for a table that still exists in both — means a column was
// renamed or silently dropped without a migration being generated.

/**
 * Parse `drizzle-kit export` SQL output into a Map<tableName, Set<columnName>>.
 * Only backtick-quoted column names inside CREATE TABLE blocks are collected.
 */
function parseExportColumns(sql) {
  const tables = new Map();
  for (const [, tableName, body] of sql.matchAll(
    /CREATE TABLE `(\w+)` \(([\s\S]*?)\);/g,
  )) {
    const cols = new Set();
    for (const [, col] of body.matchAll(/^\s*`(\w+)`\s+\w/gm)) {
      cols.add(col);
    }
    tables.set(tableName, cols);
  }
  return tables;
}

/**
 * Returns a list of { table, missingColumns[] } entries where a committed
 * snapshot column is absent from the current TypeScript schema export.
 * Returns null if the check cannot run (e.g. no migrations yet).
 */
function detectRenameDrift() {
  // Locate the latest committed snapshot
  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
  );
  if (!journal.entries?.length) return null;

  const lastIdx = [...journal.entries].sort((a, b) => b.idx - a.idx)[0].idx;
  const snapshotPath = path.join(
    MIGRATIONS_DIR,
    "meta",
    `${String(lastIdx).padStart(4, "0")}_snapshot.json`,
  );
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const snapshotTables = snapshot.tables ?? {};

  // Get current schema SQL from drizzle-kit export
  let exportSql;
  try {
    exportSql = execSync(
      "pnpm --filter @workspace/db exec drizzle-kit export --config ./drizzle.config.ts",
      {
        stdio: "pipe",
        cwd: repoRoot,
        env: {
          ...process.env,
          MYSQL_DATABASE_URL:
            process.env.MYSQL_DATABASE_URL ||
            "mysql://placeholder:x@localhost:3306/placeholder",
        },
      },
    ).toString();
  } catch {
    return null; // export unavailable — skip secondary check
  }

  const exportTables = parseExportColumns(exportSql);
  const drifted = [];

  for (const [tableName, snapshotTable] of Object.entries(snapshotTables)) {
    // Skip tables that no longer exist in the export (handled by primary check)
    if (!exportTables.has(tableName)) continue;

    const snapshotCols = new Set(Object.keys(snapshotTable.columns ?? {}));
    const exportCols = exportTables.get(tableName);

    const missing = [...snapshotCols].filter((c) => !exportCols.has(c));
    if (missing.length > 0) {
      drifted.push({ table: tableName, missingColumns: missing });
    }
  }

  return drifted.length > 0 ? drifted : null;
}

console.log("▶ Checking for column rename drift…");
const renameDrift = detectRenameDrift();
if (renameDrift) {
  const lines = renameDrift
    .map(
      ({ table, missingColumns }) =>
        `  • ${table}: column(s) in migrations but absent from schema: ${missingColumns.join(", ")}`,
    )
    .join("\n");
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  ERROR: Column rename drift detected — build aborted.               ║
╠══════════════════════════════════════════════════════════════════════╣
║  The following columns exist in the last committed migration         ║
║  snapshot but are absent from the current TypeScript schema.        ║
║  This usually means a column was renamed without generating a       ║
║  migration, which will cause a runtime failure in production.       ║
║                                                                      ║
${lines
  .split("\n")
  .map((l) => `║  ${l.padEnd(68)}║`)
  .join("\n")}
║                                                                      ║
║  Fix before deploying:                                              ║
║    1.  pnpm --filter @workspace/db run generate  (interactive)      ║
║    2.  git add lib/db/migrations/ && git commit                     ║
║    3.  Re-run the build.                                            ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

console.log("  ✅  Migrations are up to date — no uncommitted schema changes.\n");

// ── 1. Clean previous deploy dir ──────────────────────────────────────────
if (existsSync(DEPLOY_DIR)) {
  console.log("Cleaning previous hostinger/ folder…");
  rmSync(DEPLOY_DIR, { recursive: true });
}
mkdirSync(DEPLOY_DIR, { recursive: true });
mkdirSync(path.join(DEPLOY_DIR, "uploads"), { recursive: true });

// ── 2. Build the React frontend ───────────────────────────────────────────
// BASE_PATH is intentionally not set → Vite defaults to "/" (root domain).
run("pnpm --filter @workspace/ration-card-portal run build");

// ── 2b. Prerender public routes for AI crawlers (GEO) ─────────────────────
// Captures fully rendered HTML snapshots into dist/public/prerendered/ so
// GPTBot / PerplexityBot / ClaudeBot (which do not run JavaScript) can read
// the site. The API server substitutes live %%PRICE_*%% tokens per request.
run("pnpm --filter @workspace/ration-card-portal run prerender");

// ── 2c. Inline the main stylesheet into every HTML file ──────────────────
// Removes the render-blocking /assets/index-*.css request (PSI mobile charged
// it ~2 slow-4G round trips before first paint → FCP/LCP 3.1s on v8). Must
// run AFTER prerender so the snapshots are transformed too.
run("pnpm --filter @workspace/ration-card-portal run inline-css");

// ── 3. Build the API server bundle ────────────────────────────────────────
run("pnpm --filter @workspace/api-server run build");

// ── 4. Copy artefacts into hostinger/ ─────────────────────────────────────
const apiServerDir = path.join(repoRoot, "artifacts", "api-server");
const frontendDistDir = path.join(
  repoRoot,
  "artifacts",
  "ration-card-portal",
  "dist",
  "public"
);

console.log("\nCopying server bundle → hostinger/dist/ …");
cpSync(path.join(apiServerDir, "dist"), path.join(DEPLOY_DIR, "dist"), {
  recursive: true,
});

console.log("Copying React build  → hostinger/public/ …");
cpSync(frontendDistDir, path.join(DEPLOY_DIR, "public"), { recursive: true });

// ── 5. Write Hostinger package.json ──────────────────────────────────────
// mysql2 must be installed on the host because it is externalized from the bundle.
// pino-pretty is optional but helpful for readable logs in production.
const pkg = {
  name: "ration-card-portal-production",
  version: "1.0.0",
  private: true,
  type: "module",
  engines: { node: ">=20" },
  scripts: {
    // NODE_ENV=production is forced here because production mode gates
    // security-sensitive behavior (no dev OTP-code logging, canonical
    // redirect on, JSON logs). hPanel may bypass npm scripts and run the
    // startup file directly — set NODE_ENV=production in hPanel env vars
    // too (see .env.example).
    start: "NODE_ENV=production node dist/index.mjs",
  },
  dependencies: {
    // Externalized from the esbuild bundle (see api-server/build.mjs) — every
    // runtime-imported external MUST be listed here or the server crashes at
    // boot with ERR_MODULE_NOT_FOUND on Hostinger.
    "@google-cloud/storage": "^7.21.0",
    mysql2: "^3.14.1",
    "pino-pretty": "^13.1.3",
  },
};
// ── 5b. Guard: every externalized runtime import must be a declared dep ───
// esbuild leaves externalized packages behind as real top-level
// `import ... from "pkg"` statements in the bundle. Any of those missing from
// the generated dependencies crashes the server at boot on Hostinger with
// ERR_MODULE_NOT_FOUND (this happened with @google-cloud/storage).
const builtinSet = new Set(builtinModules);
const bundleImports = new Set();
for (const file of readdirSync(path.join(DEPLOY_DIR, "dist"))) {
  if (!file.endsWith(".mjs")) continue;
  const src = readFileSync(path.join(DEPLOY_DIR, "dist", file), "utf8");
  for (const m of src.matchAll(
    /^\s*(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"'./][^"']*)["']/gm
  )) {
    const spec = m[1];
    if (spec.startsWith("node:")) continue;
    const pkgName = spec.startsWith("@")
      ? spec.split("/").slice(0, 2).join("/")
      : spec.split("/")[0];
    if (!builtinSet.has(pkgName)) bundleImports.add(pkgName);
  }
}
const missingDeps = [...bundleImports].filter((p) => !pkg.dependencies[p]);
if (missingDeps.length > 0) {
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  ERROR: Bundle imports packages missing from deploy dependencies.   ║
║  The server would crash at boot on Hostinger (ERR_MODULE_NOT_FOUND).║
║                                                                      ║
║  Missing: ${missingDeps.join(", ").padEnd(59)}║
║  Fix: add them to the dependencies in build-for-hostinger.mjs.      ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}
console.log(
  `  ✅  Bundle externals check: ${[...bundleImports].sort().join(", ") || "none"} — all declared in package.json.`
);

writeFileSync(
  path.join(DEPLOY_DIR, "package.json"),
  JSON.stringify(pkg, null, 2) + "\n"
);

// ── 6. Write a .env.example ───────────────────────────────────────────────
const envExample = `# Required – MUST be "production" on the live site.
# hPanel often launches the startup file directly (bypassing npm scripts),
# so set this explicitly in hPanel's environment variables. Without it the
# server logs plaintext settings unlock codes and disables the canonical
# www→erationcards.in redirect.
NODE_ENV=production

# Required – Hostinger MySQL connection string
# Format: mysql://USER:PASSWORD@HOST:3306/DATABASE
MYSQL_DATABASE_URL=mysql://db_user:db_pass@localhost:3306/db_name

# Required – random secret for JWT signing (min 32 chars)
SESSION_SECRET=change_me_to_a_long_random_string

# Required – admin credentials
ADMIN_EMAIL=admin@erationcards.in
ADMIN_PASSWORD=change_me

# Required – UPI ID shown on the payment page
MERCHANT_UPI_ID=your-upi-id@bank

# Required – port Hostinger binds the Node.js app to (set automatically by hPanel)
PORT=3000

# Optional – absolute path where uploaded files (payment screenshots and
# card PDFs) are stored. Defaults to <deploy-root>/uploads/ if not set.
# Set this to an absolute path on your Hostinger server, e.g.:
# UPLOADS_DIR=/home/<your-user>/domains/erationcards.in/uploads
UPLOADS_DIR=

# Optional – web analytics. Leave empty to disable. Setting these needs NO
# rebuild: the server injects the tags at serve time on public pages only
# (admin/operator/processing/receipt pages are never tracked).
# GA4_MEASUREMENT_ID: Google Analytics 4 "Measurement ID", looks like G-XXXXXXXXXX
# CLARITY_PROJECT_ID: Microsoft Clarity project ID (free heatmaps + session replay)
GA4_MEASUREMENT_ID=
CLARITY_PROJECT_ID=
`;
writeFileSync(path.join(DEPLOY_DIR, ".env.example"), envExample);

// ── 8. Write a .gitignore for the deploy folder ───────────────────────────
writeFileSync(
  path.join(DEPLOY_DIR, ".gitignore"),
  "node_modules/\n.env\n"
);

// ── 9. Summary ────────────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Build complete!  Deploy package ready at: hostinger/           ║
╠══════════════════════════════════════════════════════════════════╣
║  Next steps (see replit.md "Hostinger Deployment" section):     ║
║                                                                  ║
║  1. Create MySQL database in Hostinger hPanel                   ║
║  2. Set environment variables in hPanel (see .env.example)      ║
║  3. Apply schema migrations (from this repo):                   ║
║     pnpm --filter @workspace/db run generate                    ║
║     MYSQL_DATABASE_URL=... pnpm --filter @workspace/scripts \   ║
║       run migrate                                               ║
║  4. Upload the hostinger/ folder to your Hostinger Node.js app  ║
║  5. In hPanel SSH terminal: cd <app-root> && npm install        ║
║  6. Start / restart the Node.js app in hPanel                   ║
║                                                                  ║
║  Or run all of the above in one command:                        ║
║     MYSQL_DATABASE_URL=... pnpm --filter @workspace/scripts \   ║
║       run deploy-for-hostinger                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
