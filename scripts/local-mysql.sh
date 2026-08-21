#!/usr/bin/env bash
# Temporary practice MariaDB for local journey testing (task #344).
# MariaDB (not MySQL 8) because the live Hostinger server is MariaDB —
# the schema uses UNIQUE keys on TEXT columns, which MySQL 8 rejects.
# Runs a throwaway server on 127.0.0.1:3311 with its data inside
# .local-mysql/ (gitignored). No real customer data ever touches this.
# Delete the workflow and the .local-mysql/ directory to remove all traces.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/.local-mysql"
DATA="$DIR/data"
SOCK="$DIR/mysql.sock"
PORT=3311
READY="$DIR/ready"

mkdir -p "$DIR"
rm -f "$READY"

if [ ! -d "$DATA/mysql" ]; then
  echo "[local-mysql] first run: initializing MariaDB data directory..."
  mariadb-install-db \
    --datadir="$DATA" \
    --auth-root-authentication-method=normal \
    --skip-test-db
  echo "[local-mysql] init done."
fi

echo "[local-mysql] starting mariadbd on 127.0.0.1:$PORT (socket $SOCK)"
mariadbd \
  --datadir="$DATA" \
  --port="$PORT" \
  --bind-address=127.0.0.1 \
  --socket="$SOCK" \
  --pid-file="$DIR/mysqld.pid" \
  --skip-name-resolve &
MYSQL_PID=$!

cleanup() {
  kill "$MYSQL_PID" >/dev/null 2>&1 || true
  wait "$MYSQL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 60); do
  if mariadb --socket="$SOCK" -u root -e "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$MYSQL_PID" >/dev/null 2>&1; then
    echo "[local-mysql] mariadbd stopped before becoming ready." >&2
    exit 1
  fi
  sleep 1
done

if ! mariadb --socket="$SOCK" -u root -e "SELECT 1" >/dev/null 2>&1; then
  echo "[local-mysql] MariaDB did not become ready within 60 seconds." >&2
  exit 1
fi

echo "[local-mysql] provisioning the development database..."
mariadb --socket="$SOCK" -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS rationcards_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app'@'127.0.0.1' IDENTIFIED BY 'e1ee10f56b3e05327b96f181';
ALTER USER 'app'@'127.0.0.1' IDENTIFIED BY 'e1ee10f56b3e05327b96f181';
GRANT ALL PRIVILEGES ON rationcards_test.* TO 'app'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

echo "[local-mysql] applying tracked migrations..."
MYSQL_DATABASE_URL="mysql://app:e1ee10f56b3e05327b96f181@127.0.0.1:$PORT/rationcards_test" \
  pnpm --filter @workspace/scripts run migrate

touch "$READY"
echo "[local-mysql] ready for the API server."
wait "$MYSQL_PID"
