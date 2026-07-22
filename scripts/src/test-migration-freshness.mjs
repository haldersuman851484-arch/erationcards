#!/usr/bin/env node
/**
 * test-migration-freshness.mjs
 *
 * Validates that the migration freshness check (step 0 of build-for-hostinger.mjs)
 * correctly detects uncommitted schema changes for four mutation types:
 *
 *   1. New column added   — primary check: drizzle-kit generates ALTER TABLE ADD COLUMN
 *   2. Column renamed     — secondary check: snapshot vs export column comparison
 *   3. Enum value added   — primary check: drizzle-kit generates enum-related migration
 *   4. Table dropped      — primary check: drizzle-kit generates DROP TABLE
 *
 * The rename scenario is caught by a secondary check (step 0b in build-for-hostinger.mjs):
 * drizzle-kit generate silently exits 0 for renames in non-interactive mode, but the
 * secondary check compares column names in the latest committed meta snapshot against
 * the current TypeScript schema export to detect the discrepancy.
 *
 * Usage (from repo root):
 *   pnpm --filter @workspace/scripts run test-migration-freshness
 *
 * Exit codes:
 *   0 — all four scenarios correctly triggered detection and left migrations/ clean
 *   1 — one or more scenarios failed to trigger detection (check is broken)
 */

import { execSync } from "node:child_process";
import {
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
const MIGRATIONS_DIR = path.join(repoRoot, "lib", "db", "migrations");
const SCHEMA_DIR = path.join(repoRoot, "lib", "db", "src", "schema");

// ── Snapshot / restore helpers (same logic as build-for-hostinger.mjs) ─────

/** Recursively collect every file under a directory as Map<relPath, Buffer>. */
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

/** Restore `dir` to exactly the state captured in `before`. */
function restoreDir(dir, before) {
  const after = snapshotDir(dir);
  for (const rel of after.keys()) {
    if (!before.has(rel)) rmSync(path.join(dir, rel));
  }
  for (const [rel, content] of before) {
    const current = after.get(rel);
    if (!current || !current.equals(content)) {
      mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), content);
    }
  }
}

// ── Primary freshness check (same logic as build-for-hostinger.mjs step 0) ─

/**
 * Runs drizzle-kit generate and checks for new SQL files.
 * Always restores migrations/ before returning.
 *
 * Returns { detected: boolean, newSqlFiles: string[], generateFailed: boolean, stderr: string }
 */
function runPrimaryCheck(migrationsBefore) {
  let generateFailed = false;
  let generateStderr = "";

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
    generateFailed = true;
    generateStderr = err.stderr?.toString() ?? err.message;
  }

  const migrationsAfter = snapshotDir(MIGRATIONS_DIR);
  const newSqlFiles = [...migrationsAfter.keys()].filter(
    (rel) => rel.endsWith(".sql") && !migrationsBefore.has(rel),
  );

  restoreDir(MIGRATIONS_DIR, migrationsBefore);

  return {
    detected: newSqlFiles.length > 0 || generateFailed,
    newSqlFiles,
    generateFailed,
    generateStderr,
  };
}

// ── Secondary rename-drift check (same logic as build-for-hostinger.mjs 0b) ─

/**
 * Parse drizzle-kit export SQL into Map<tableName, Set<columnName>>.
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
 * Compare the latest committed meta snapshot against drizzle-kit export output.
 * Returns { detected: boolean, drifted: Array<{table, missingColumns}> }
 */
function runSecondaryCheck() {
  // Locate the latest committed snapshot
  let journal;
  try {
    journal = JSON.parse(
      readFileSync(
        path.join(MIGRATIONS_DIR, "meta", "_journal.json"),
        "utf8",
      ),
    );
  } catch {
    return { detected: false, drifted: [] };
  }
  if (!journal.entries?.length) return { detected: false, drifted: [] };

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
    return { detected: false, drifted: [] };
  }

  const exportTables = parseExportColumns(exportSql);
  const drifted = [];

  for (const [tableName, snapshotTable] of Object.entries(snapshotTables)) {
    // Skip tables not in export — table drop is caught by the primary check
    if (!exportTables.has(tableName)) continue;

    const snapshotCols = new Set(Object.keys(snapshotTable.columns ?? {}));
    const exportCols = exportTables.get(tableName);
    const missing = [...snapshotCols].filter((c) => !exportCols.has(c));

    if (missing.length > 0) {
      drifted.push({ table: tableName, missingColumns: missing });
    }
  }

  return { detected: drifted.length > 0, drifted };
}

/**
 * Run both primary (generate) and secondary (snapshot vs export) checks.
 * Returns { detected, detail } where detail describes how the drift was found.
 */
function runFreshnessCheck(migrationsBefore) {
  const primary = runPrimaryCheck(migrationsBefore);
  if (primary.detected) {
    const label = primary.generateFailed
      ? "generate error"
      : `${primary.newSqlFiles.length} new SQL file(s)`;
    return { detected: true, detail: `primary check (${label})` };
  }

  const secondary = runSecondaryCheck();
  if (secondary.detected) {
    const cols = secondary.drifted
      .map(({ table, missingColumns }) => `${table}.{${missingColumns.join(",")}}`)
      .join("; ");
    return { detected: true, detail: `secondary rename check (${cols})` };
  }

  return { detected: false, detail: "neither primary nor secondary check detected drift" };
}

// ── Schema mutation scenarios ────────────────────────────────────────────────

const SCENARIOS = [
  {
    name: "New column added",
    description:
      "Add a test column to operators table — primary check should detect ALTER TABLE ADD COLUMN",
    schemaFile: path.join(SCHEMA_DIR, "operators.ts"),
    mutate(original) {
      return original.replace(
        "  updatedAt: timestamp(\"updated_at\").notNull().defaultNow(),",
        "  updatedAt: timestamp(\"updated_at\").notNull().defaultNow(),\n" +
          "  _testNewCol: text(\"_test_new_col\"),",
      );
    },
  },
  {
    name: "Column renamed",
    description:
      "Rename 'phone' → 'phone_number' in operators table (property + SQL name).\n" +
      "  drizzle-kit generate exits 0 with no SQL (non-interactive pipe mode).\n" +
      "  Secondary check catches it: snapshot has 'phone', export has 'phone_number'.",
    schemaFile: path.join(SCHEMA_DIR, "operators.ts"),
    mutate(original) {
      // Change both the TS property name AND the SQL column name string —
      // the canonical rename pattern that drizzle-kit cannot confirm without interaction.
      return original.replace(
        `  phone: text("phone").notNull(),`,
        `  phoneNumber: text("phone_number").notNull(),`,
      );
    },
  },
  {
    name: "Enum value added",
    description:
      "Add 'archived' to operators.status enum — primary check should detect enum-related migration",
    schemaFile: path.join(SCHEMA_DIR, "operators.ts"),
    mutate(original) {
      return original.replace(
        `mysqlEnum("status", ["pending", "active", "suspended"])`,
        `mysqlEnum("status", ["pending", "active", "suspended", "archived"])`,
      );
    },
  },
  {
    name: "Table dropped",
    description:
      "Remove operators table from schema index — primary check should detect DROP TABLE",
    schemaFile: path.join(SCHEMA_DIR, "index.ts"),
    mutate(original) {
      return original.replace(`export * from "./operators";\n`, "");
    },
  },
];

// ── Run all scenarios ────────────────────────────────────────────────────────

const results = [];
let anyFailed = false;

console.log("=== Migration freshness check — scenario tests ===\n");
console.log(
  "Each scenario temporarily mutates a schema file, runs both the primary\n" +
    "(drizzle-kit generate) and secondary (snapshot vs export) freshness checks,\n" +
    "then restores everything. All four scenarios must trigger detection.\n",
);

for (const scenario of SCENARIOS) {
  process.stdout.write(`▶ ${scenario.name}\n  ${scenario.description}\n`);

  // 1. Read and save original schema file
  const originalContent = readFileSync(scenario.schemaFile, "utf8");

  // 2. Apply mutation
  const mutatedContent = scenario.mutate(originalContent);
  if (mutatedContent === originalContent) {
    console.log("  ❌  FAIL — mutation did not change the file (pattern not found)\n");
    results.push({ scenario: scenario.name, status: "FAIL (pattern not found)" });
    anyFailed = true;
    continue;
  }

  // 3. Snapshot migrations/ before the check
  const migrationsBefore = snapshotDir(MIGRATIONS_DIR);

  // 4. Write mutated schema
  writeFileSync(scenario.schemaFile, mutatedContent, "utf8");

  let check;
  try {
    // 5. Run combined freshness check (primary restores migrations/ internally)
    check = runFreshnessCheck(migrationsBefore);
  } finally {
    // 6. Always restore the schema file
    writeFileSync(scenario.schemaFile, originalContent, "utf8");
  }

  // 7. Confirm migrations/ is clean (no stray SQL files)
  const migrationsNow = snapshotDir(MIGRATIONS_DIR);
  const strayFiles = [...migrationsNow.keys()].filter(
    (rel) => rel.endsWith(".sql") && !migrationsBefore.has(rel),
  );
  const clean = strayFiles.length === 0;

  if (check.detected && clean) {
    console.log(`  ✅  PASS — ${check.detail}; migrations/ is clean\n`);
    results.push({ scenario: scenario.name, status: "PASS" });
  } else {
    anyFailed = true;
    const reasons = [];
    if (!check.detected) reasons.push(check.detail);
    if (!clean) reasons.push(`${strayFiles.length} stray file(s) left: ${strayFiles.join(", ")}`);
    console.error(`  ❌  FAIL — ${reasons.join("; ")}\n`);
    results.push({ scenario: scenario.name, status: "FAIL", reasons });
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("Results:");
for (const r of results) {
  const icon = r.status === "PASS" ? "✅" : "❌";
  console.log(`  ${icon}  ${r.scenario} — ${r.status}`);
}
console.log("═══════════════════════════════════════════════════════════\n");

if (anyFailed) {
  console.error(
    "❌ One or more scenarios failed to trigger the freshness error.\n" +
      "   Review output above — the check may not block risky schema changes.\n",
  );
  process.exit(1);
} else {
  console.log(
    "✅ All four scenarios passed.\n" +
      "   Primary check catches: new columns, enum changes, table drops.\n" +
      "   Secondary check catches: column renames (snapshot vs export comparison).\n" +
      "   migrations/ is clean after every scenario.\n",
  );
  process.exit(0);
}
