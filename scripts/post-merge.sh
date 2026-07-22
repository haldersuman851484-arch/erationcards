#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Only push the DB schema if a MySQL URL is available.
# In the Replit dev environment the DB is PostgreSQL; the MySQL URL is only
# set when the Hostinger credentials have been added (MYSQL_DATABASE_URL).
if [ -n "$MYSQL_DATABASE_URL" ]; then
  pnpm --filter @workspace/db push
else
  echo "MYSQL_DATABASE_URL not set — skipping drizzle-kit push (dev environment uses PostgreSQL)"
fi
