#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
socket="$root/.local-mysql/mysql.sock"
ready="$root/.local-mysql/ready"

for _ in $(seq 1 60); do
  if [[ -f "$ready" ]] &&
    MYSQL_PWD="e1ee10f56b3e05327b96f181" mariadb \
      --protocol=TCP \
      --host=127.0.0.1 \
      --port=3311 \
      --user=app \
      --database=rationcards_test \
      -e "SELECT 1" >/dev/null 2>&1; then
    exec pnpm --filter @workspace/api-server run dev
  fi
  sleep 1
done

echo "Local MariaDB did not become ready within 60 seconds." >&2
exit 1