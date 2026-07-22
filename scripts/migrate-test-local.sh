#!/usr/bin/env bash
# ============================================================================
# migrate-test-local.sh
#
# Validates migration safety before deploying to Hostinger.  Runs two modes:
#
#   STATIC mode (default — no database required):
#     1. drizzle-kit generate  → produce SQL from the current schema
#     2. check-migrations      → flag any destructive SQL (DROP COLUMN, etc.)
#
#   FULL mode (requires a staging/test database URL):
#     1. drizzle-kit generate  → produce SQL from the current schema
#     2. check-migrations      → flag any destructive SQL
#     3. migrate               → apply to the staging database
#     4. schema verify         → confirm all tables and key columns exist
#
# Usage (from repo root):
#
#   # Static safety check — always safe to run:
#   pnpm --filter @workspace/scripts run migrate-test-local
#
#   # Full end-to-end test — requires a THROWAWAY staging/test database:
#   MIGRATION_TEST_DB_URL="mysql://user:pass@host:3306/staging_db" \
#     pnpm --filter @workspace/scripts run migrate-test-local
#
#   ⚠️  NEVER set MIGRATION_TEST_DB_URL to your live production database.
#       The full test applies ALL migrations from scratch against an empty DB.
#
# Exit code 0 = all checks passed
# Exit code 1 = failure (see output for details)
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
fail()  { echo ""; echo "❌  $*" >&2; exit 1; }
step()  { echo ""; echo "──── $* ────"; }
info()  { echo "  $*"; }
pass()  { echo "  ✅  $*"; }
warn()  { echo "  ⚠️   $*"; }

# --------------------------------------------------------------------------
# Schema verification (full mode only)
# --------------------------------------------------------------------------
verify_schema() {
  local db_url="$1"
  local host port db_name user
  # Parse mysql://user:pass@host:port/dbname
  host="$(echo "$db_url"    | sed -E 's|mysql://[^@]+@([^:/]+).*|\1|')"
  port="$(echo "$db_url"    | sed -E 's|mysql://[^@]+@[^:]+:([0-9]+)/.*|\1|')"
  db_name="$(echo "$db_url" | sed -E 's|mysql://[^/]+/([^?]+).*|\1|')"
  user="$(echo "$db_url"    | sed -E 's|mysql://([^:@]+).*|\1|')"
  local pass_part
  pass_part="$(echo "$db_url" | sed -E 's|mysql://[^:]+:([^@]*)@.*|\1|')"

  local mysql_args=(-u "$user" -h "$host" -P "$port" "$db_name" --batch --skip-column-names)
  if [[ -n "$pass_part" ]]; then
    mysql_args+=(-p"$pass_part")
  fi

  check_table() {
    local tbl="$1"
    local result
    result=$(mysql "${mysql_args[@]}" \
      -e "SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema='$db_name' AND table_name='$tbl';" 2>/dev/null)
    if [[ "$result" == "1" ]]; then
      pass "table '$tbl' exists"
    else
      fail "table '$tbl' is missing after migration"
    fi
  }

  check_column() {
    local tbl="$1" col="$2"
    local result
    result=$(mysql "${mysql_args[@]}" \
      -e "SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema='$db_name' AND table_name='$tbl' AND column_name='$col';" 2>/dev/null)
    if [[ "$result" == "1" ]]; then
      pass "column '$tbl.$col' exists"
    else
      fail "column '$col' missing from table '$tbl' after migration"
    fi
  }

  step "Verifying schema"

  check_table "orders"
  check_table "operators"
  check_table "payment_verifications"
  check_table "__drizzle_migrations"

  check_column "orders"    "id"
  check_column "orders"    "order_number"
  check_column "orders"    "customer_name"
  check_column "orders"    "payment_status"
  check_column "orders"    "status"
  check_column "orders"    "family_cards"
  check_column "orders"    "ration_card_pdfs"
  check_column "orders"    "operator_id"
  check_column "orders"    "courier_name"
  check_column "orders"    "tracking_number"

  check_column "operators" "id"
  check_column "operators" "email"
  check_column "operators" "password_hash"
  check_column "operators" "status"
  check_column "operators" "wallet_balance"

  check_column "payment_verifications" "id"
  check_column "payment_verifications" "order_id"
  check_column "payment_verifications" "action"
}

# ============================================================================
# Main
# ============================================================================

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Migration safety test"
echo "════════════════════════════════════════════════════════════"

# --------------------------------------------------------------------------
# Step 1: Determine mode
#
# We deliberately do NOT inherit MYSQL_DATABASE_URL / DATABASE_URL here —
# those variables may point to the live production database.  The full
# migration test requires a dedicated empty staging database passed via
# MIGRATION_TEST_DB_URL.
# --------------------------------------------------------------------------
ACTIVE_DB_URL="${MIGRATION_TEST_DB_URL:-}"

if [[ -n "$ACTIVE_DB_URL" ]]; then
  MODE="full"
  info "MIGRATION_TEST_DB_URL set — running in FULL mode"
  info "(apply migrations + verify schema against staging database)"
else
  MODE="static"
  info "No MIGRATION_TEST_DB_URL — running in STATIC mode"
  info "(generate migrations + check for destructive SQL only)"
fi

# --------------------------------------------------------------------------
# Step 2: Generate migrations from the current schema
# --------------------------------------------------------------------------
step "Generating migrations from schema (drizzle-kit generate)"
# Pass a placeholder URL so drizzle.config.ts does not throw — generate
# does not open a real database connection; it only reads the schema files.
MYSQL_DATABASE_URL="${ACTIVE_DB_URL:-mysql://placeholder:x@localhost:3306/placeholder}" \
  pnpm --filter @workspace/db run generate \
  || fail "drizzle-kit generate failed — fix the schema before deploying"

# --------------------------------------------------------------------------
# Step 3: Static analysis — check for destructive SQL
# --------------------------------------------------------------------------
step "Checking for destructive SQL (check-migrations)"
pnpm --filter @workspace/scripts run check-migrations \
  || fail "Dangerous migration operations detected — review before deploying"

# --------------------------------------------------------------------------
# Step 4 (full mode only): Apply migrations and verify schema
# --------------------------------------------------------------------------
if [[ "$MODE" == "full" ]]; then
  step "Applying migrations to staging database"
  MYSQL_DATABASE_URL="$ACTIVE_DB_URL" \
    pnpm --filter @workspace/scripts run migrate \
    || fail "migrate.ts failed — migrations could not be applied to staging DB"

  verify_schema "$ACTIVE_DB_URL"

  echo ""
  echo "🎉  Full migration smoke test passed."
  echo "    Schema is correct and migrations apply cleanly on a fresh database."
  echo ""
else
  echo ""
  echo "✅  Static migration checks passed."
  echo ""
  echo "    To run the full end-to-end test (recommended before each deploy):"
  echo ""
  echo "      MIGRATION_TEST_DB_URL=\"mysql://user:pass@host:3306/staging_db\" \\"
  echo "        pnpm --filter @workspace/scripts run migrate-test-local"
  echo ""
  echo "    Requirements for the staging DB:"
  echo "      • Must be a throwaway / empty database — NOT your live production DB"
  echo "      • Must use MySQL / MariaDB (same dialect as Hostinger)"
  echo "      • The test will create all tables from scratch"
  echo "      • After the test you can DROP the staging DB or reuse it next time"
  echo "        (Drizzle tracks applied migrations in __drizzle_migrations and"
  echo "         will skip already-applied ones on subsequent runs)"
  echo ""
fi
