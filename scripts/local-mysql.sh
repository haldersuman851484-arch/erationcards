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

mkdir -p "$DIR"

if [ ! -d "$DATA/mysql" ]; then
  echo "[local-mysql] first run: initializing MariaDB data directory..."
  mariadb-install-db \
    --datadir="$DATA" \
    --auth-root-authentication-method=normal \
    --skip-test-db
  echo "[local-mysql] init done."
fi

echo "[local-mysql] starting mariadbd on 127.0.0.1:$PORT (socket $SOCK)"
exec mariadbd \
  --datadir="$DATA" \
  --port="$PORT" \
  --bind-address=127.0.0.1 \
  --socket="$SOCK" \
  --pid-file="$DIR/mysqld.pid" \
  --skip-name-resolve
