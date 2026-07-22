#!/bin/bash
set -e
pnpm install --frozen-lockfile

# DB schema push is NOT run automatically on merge.
# Run it manually when you want to apply schema changes to the database:
#   pnpm --filter @workspace/db run push
# For Hostinger production, run this after deploying the hostinger/ folder
# from within the Hostinger environment (where MySQL is reachable).
