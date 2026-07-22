/**
 * check-migrations.ts
 *
 * Reads every SQL file in lib/db/migrations/ and flags operations that could
 * destroy or corrupt data on a live production database.
 *
 * Exit code 0  — no dangerous operations found (safe to proceed)
 * Exit code 1  — dangerous operations detected (block the deploy)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run check-migrations
 *   pnpm --filter @workspace/scripts run check-migrations -- --warn-only
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "../../lib/db/migrations");

const WARN_ONLY = process.argv.includes("--warn-only");

interface Finding {
  file: string;
  line: number;
  text: string;
  severity: "DANGER" | "WARN";
  reason: string;
}

/**
 * Patterns that are always dangerous — they destroy data permanently.
 */
const DANGER_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  {
    re: /DROP\s+TABLE\b/i,
    reason: "Drops an entire table — all rows in that table will be lost.",
  },
  {
    re: /DROP\s+COLUMN\b/i,
    reason: "Removes a column — all values stored in that column will be lost.",
  },
  {
    re: /TRUNCATE\b/i,
    reason: "Deletes every row in the table.",
  },
  {
    re: /DROP\s+INDEX\b/i,
    reason:
      "Removes an index — may silently break unique constraints protecting data integrity.",
  },
  {
    re: /DROP\s+DATABASE\b/i,
    reason: "Drops the entire database.",
  },
];

/**
 * Patterns that are potentially dangerous and require human review.
 * Drizzle emits ALTER TABLE … MODIFY COLUMN when an enum changes,
 * which can fail if existing rows hold a value not in the new enum list.
 */
const WARN_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  {
    re: /MODIFY\s+COLUMN\b/i,
    reason:
      "Modifies a column definition (type or enum values). " +
      "If existing rows contain a value removed from an enum, MySQL will reject the migration.",
  },
  {
    re: /CHANGE\s+COLUMN\b/i,
    reason:
      "Renames or redefines a column. " +
      "App code and queries that reference the old name will break immediately.",
  },
  {
    re: /ALTER\s+TABLE\b.+RENAME\b/i,
    reason:
      "Renames a table. Any code or query referencing the old name will break.",
  },
  {
    re: /RENAME\s+TABLE\b/i,
    reason:
      "Renames a table. Any code or query referencing the old name will break.",
  },
];

function scanFile(filePath: string): Finding[] {
  const rel = path.relative(process.cwd(), filePath);
  const findings: Finding[] = [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error(`  Could not read ${rel}: ${(err as Error).message}`);
    return findings;
  }

  // Split on drizzle's statement-breakpoint delimiter AND normal newlines so we
  // get one logical line per SQL statement for accurate line reporting.
  const rawLines = content.split("\n");

  rawLines.forEach((text, idx) => {
    const line = idx + 1;
    const stripped = text.replace(/--.*$/, "").trim(); // strip SQL line comments

    for (const { re, reason } of DANGER_PATTERNS) {
      if (re.test(stripped)) {
        findings.push({ file: rel, line, text: text.trim(), severity: "DANGER", reason });
      }
    }
    for (const { re, reason } of WARN_PATTERNS) {
      if (re.test(stripped)) {
        findings.push({ file: rel, line, text: text.trim(), severity: "WARN", reason });
      }
    }
  });

  return findings;
}

function run() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(
      `No migrations directory found at ${MIGRATIONS_DIR}.\n` +
        `Run \`pnpm --filter @workspace/db run generate\` first.`
    );
    process.exit(0);
  }

  const sqlFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(MIGRATIONS_DIR, f));

  if (sqlFiles.length === 0) {
    console.log("No SQL migration files found. Nothing to check.");
    process.exit(0);
  }

  console.log(`\nScanning ${sqlFiles.length} migration file(s) for destructive operations…\n`);

  const allFindings: Finding[] = sqlFiles.flatMap(scanFile);
  const dangers = allFindings.filter((f) => f.severity === "DANGER");
  const warnings = allFindings.filter((f) => f.severity === "WARN");

  if (allFindings.length === 0) {
    console.log("✅  No destructive operations detected. Safe to deploy.\n");
    process.exit(0);
  }

  if (warnings.length > 0) {
    console.log(`⚠️   ${warnings.length} WARNING(s) — review before deploying:\n`);
    for (const w of warnings) {
      console.log(`  [WARN]  ${w.file}:${w.line}`);
      console.log(`          SQL: ${w.text}`);
      console.log(`          Why: ${w.reason}\n`);
    }
  }

  if (dangers.length > 0) {
    console.log(`❌  ${dangers.length} DANGEROUS operation(s) detected:\n`);
    for (const d of dangers) {
      console.log(`  [DANGER]  ${d.file}:${d.line}`);
      console.log(`            SQL: ${d.text}`);
      console.log(`            Why: ${d.reason}\n`);
    }

    if (WARN_ONLY) {
      console.log(
        "  --warn-only flag set: exiting 0 despite dangerous operations.\n" +
          "  You MUST manually verify these will not destroy production data.\n"
      );
      process.exit(0);
    }

    console.log(
      "  Deploy blocked. Fix the migrations or pass --warn-only if you have\n" +
        "  manually verified no production data will be lost.\n"
    );
    process.exit(1);
  }

  // Only warnings, no dangers
  if (WARN_ONLY) {
    process.exit(0);
  }
  // Warnings alone do not block; they require human review but allow the deploy
  console.log("  ⚠️  Review the warnings above before deploying.\n");
  process.exit(0);
}

run();
