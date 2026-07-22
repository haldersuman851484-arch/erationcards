/**
 * check-enum-conflicts.ts
 *
 * Reads pending SQL migration files, finds every MODIFY COLUMN that changes an
 * enum definition, then connects to the target database and reports any rows
 * whose current value is NOT in the new enum list.
 *
 * MySQL silently rejects such a migration (or corrupts the value to '') — this
 * script surfaces the problem before you hit that failure in production.
 *
 * Exit codes:
 *   0 — no conflicts found (safe to migrate)
 *   1 — conflicts found OR configuration error (block the deploy)
 *
 * Usage (standalone):
 *   MYSQL_DATABASE_URL="mysql://user:pass@host:3306/db" \
 *     pnpm --filter @workspace/scripts run check-enum-conflicts
 *
 * Usage inside migrate-test-local.sh (full mode):
 *   The script is called automatically with MYSQL_DATABASE_URL set to
 *   MIGRATION_TEST_DB_URL so it checks the staging database.
 *
 * The script checks MIGRATION_TEST_DB_URL first (preferred in CI / staging
 * scenarios) then falls back to MYSQL_DATABASE_URL / DATABASE_URL so it can
 * also be pointed at the live production DB before a real deploy.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "../../lib/db/migrations");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnumModification {
  file: string;
  table: string;
  column: string;
  newValues: string[];
}

interface Conflict {
  table: string;
  column: string;
  conflictingValue: string;
  rowCount: number;
}

// ---------------------------------------------------------------------------
// SQL parsing
// ---------------------------------------------------------------------------

/**
 * Scan every SQL migration file for ALTER TABLE … MODIFY COLUMN … enum(…)
 * statements and return the list of (table, column, new enum values) tuples.
 */
function parseEnumModifications(): EnumModification[] {
  const mods: EnumModification[] = [];

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return mods;
  }

  const sqlFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(MIGRATIONS_DIR, f));

  for (const filePath of sqlFiles) {
    const rel = path.relative(process.cwd(), filePath);
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error(`  Could not read ${rel}: ${(err as Error).message}`);
      continue;
    }

    // Drizzle separates statements with -->statement-breakpoint.
    // We also split on bare semicolons so we handle hand-written migrations.
    const rawStatements = content
      .split(/-->statement-breakpoint/i)
      .flatMap((chunk) => chunk.split(/;\s*\n/))
      .map((s) =>
        s
          .split("\n")
          .map((line) => line.replace(/--.*$/, "")) // strip SQL line comments
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean);

    for (const stmt of rawStatements) {
      // Must be an ALTER TABLE that contains MODIFY COLUMN with an enum type.
      if (!/ALTER\s+TABLE\b/i.test(stmt)) continue;
      if (!/MODIFY\s+COLUMN\b/i.test(stmt)) continue;
      if (!/\benum\s*\(/i.test(stmt)) continue;

      const tableMatch = stmt.match(/ALTER\s+TABLE\s+[`"']?(\w+)[`"']?/i);
      if (!tableMatch) continue;
      const table = tableMatch[1];

      // There may be multiple MODIFY COLUMN clauses in one ALTER TABLE.
      // Walk through all occurrences.
      const modifyRe =
        /MODIFY\s+COLUMN\s+[`"']?(\w+)[`"']?\s+enum\s*\(([^)]+)\)/gi;
      let modifyMatch: RegExpExecArray | null;
      while ((modifyMatch = modifyRe.exec(stmt)) !== null) {
        const column = modifyMatch[1];
        const enumBody = modifyMatch[2];

        // Parse 'value1','value2',... (handles single-quoted identifiers)
        const newValues: string[] = [];
        const valRe = /'((?:[^'\\]|\\.)*)'/g;
        let valMatch: RegExpExecArray | null;
        while ((valMatch = valRe.exec(enumBody)) !== null) {
          newValues.push(valMatch[1]);
        }

        if (newValues.length > 0) {
          mods.push({ file: rel, table, column, newValues });
        }
      }
    }
  }

  return mods;
}

// ---------------------------------------------------------------------------
// DB conflict detection
// ---------------------------------------------------------------------------

function buildMysqlUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * For each (table, column, newValues) tuple, query the live database for rows
 * whose current value is NOT in the new enum list.
 *
 * Returns one Conflict entry per distinct offending value.
 */
async function detectConflicts(
  dbUrl: string,
  mods: EnumModification[]
): Promise<Conflict[]> {
  const connection = await mysql.createConnection({
    uri: buildMysqlUrl(dbUrl),
    ssl: { rejectUnauthorized: false },
  });

  const conflicts: Conflict[] = [];

  try {
    for (const mod of mods) {
      // Verify the table and column actually exist before querying — the
      // modification may be part of a new-table migration that hasn't run yet.
      const [colRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name   = ?
           AND column_name  = ?`,
        [mod.table, mod.column]
      );

      const exists = Number((colRows as mysql.RowDataPacket[])[0]?.cnt ?? 0) > 0;
      if (!exists) {
        // Column doesn't exist yet — nothing to conflict.
        continue;
      }

      // Build a parameterised NOT IN query.
      const placeholders = mod.newValues.map(() => "?").join(", ");
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT \`${mod.column}\` AS val, COUNT(*) AS cnt
         FROM \`${mod.table}\`
         WHERE \`${mod.column}\` NOT IN (${placeholders})
         GROUP BY \`${mod.column}\``,
        mod.newValues
      );

      for (const row of rows as mysql.RowDataPacket[]) {
        conflicts.push({
          table: mod.table,
          column: mod.column,
          conflictingValue: String(row.val ?? "(NULL)"),
          rowCount: Number(row.cnt),
        });
      }
    }
  } finally {
    await connection.end();
  }

  return conflicts;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  console.log("\nScanning migration files for pending enum modifications…\n");

  // -- Parse migrations -------------------------------------------------
  const mods = parseEnumModifications();

  if (mods.length === 0) {
    console.log("  No MODIFY COLUMN enum changes found in migration files.");
    console.log("  ✅  Nothing to check — no enum conflicts possible.\n");
    process.exit(0);
  }

  console.log(
    `  Found ${mods.length} MODIFY COLUMN enum change(s) across migration files:\n`
  );
  for (const m of mods) {
    console.log(`    • ${m.file} → ${m.table}.${m.column}`);
    console.log(`      New allowed values: ${m.newValues.map((v) => `'${v}'`).join(", ")}`);
  }
  console.log("");

  // -- Resolve DB URL ---------------------------------------------------
  const dbUrl =
    process.env.MIGRATION_TEST_DB_URL ||
    process.env.MYSQL_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error(
      "  ❌  No database URL set.\n" +
        "      Set MYSQL_DATABASE_URL (or MIGRATION_TEST_DB_URL for staging) to\n" +
        "      the database you are about to migrate and re-run this script.\n"
    );
    process.exit(1);
  }

  // Mask password for display
  let displayUrl = dbUrl;
  try {
    const u = new URL(dbUrl);
    if (u.password) u.password = "***";
    displayUrl = u.toString();
  } catch {
    /* not a URL — leave as-is */
  }
  console.log(`  Connecting to: ${displayUrl}\n`);

  // -- Detect conflicts -------------------------------------------------
  let conflicts: Conflict[];
  try {
    conflicts = await detectConflicts(dbUrl, mods);
  } catch (err) {
    console.error(
      `  ❌  Could not connect to the database: ${(err as Error).message}\n`
    );
    process.exit(1);
  }

  // -- Report -----------------------------------------------------------
  if (conflicts.length === 0) {
    console.log(
      "  ✅  No enum conflicts detected — all existing rows are compatible\n" +
        "      with the new enum definitions. Safe to migrate.\n"
    );
    process.exit(0);
  }

  console.log(
    `  ❌  ${conflicts.length} enum conflict(s) detected.\n` +
      "      The following rows contain values that are NOT in the new enum\n" +
      "      definition and would cause MySQL to reject the migration:\n"
  );

  for (const c of conflicts) {
    console.log(`  Table:    ${c.table}`);
    console.log(`  Column:   ${c.column}`);
    console.log(`  Value:    '${c.conflictingValue}'`);
    console.log(`  Rows:     ${c.rowCount}`);
    console.log("");
  }

  console.log(
    "  Fix the conflicting rows before running the migration, for example:\n" +
      "    UPDATE `<table>` SET `<column>` = '<new_value>' WHERE `<column>` = '<old_value>';\n" +
      "  Then re-run this check to confirm no conflicts remain.\n"
  );

  process.exit(1);
}

run().catch((err) => {
  console.error(`Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
