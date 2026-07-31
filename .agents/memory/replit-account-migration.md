---
name: Replit account migration via GitHub
description: Moving this project between Replit accounts; GitHub push-credential quirks; what does not travel via git
---
- Code + all notes live in the private GitHub repo `haldersuman851484-arch/erationcards` (branch `main`). The live site runs on Hostinger (see hostinger-deploy-bundle.md) and is untouched by any Replit account move.
- **Two different GitHub hookups exist on Replit.** The GitHub *connector/integration* (API access via proxyFetch — can create repos) is NOT the credential `gitPush` uses. Pushing needs the **"GitHub Source Control"** connection: Replit Settings → Integrations → search "git" → card labelled *GitHub / Source Control* (or replit.com/account → Connected services).
  **Why:** gitPush returned NO_CREDENTIALS repeatedly while the API connector was active; it worked only after the Source Control card showed Active.
- Clicking "Sign in" from inside the workspace Git pane can fail with "replit.com refused to connect" — the OAuth callback is blocked inside the embedded frame. **How to apply:** send the user to a top-level page (Settings → Integrations search, or replit.com/account) to authorize.
- `gitPush` can return CLI_ERROR `BRANCH_ALREADY_EXISTS` when the remote branch is already created/synced. Before treating it as a failure, check whether `origin/main` already sits at local HEAD (`git log --oneline -1`).
- Does NOT travel via git: secret values (re-enter in the new account's Secrets pane; the user can copy values from Hostinger → Environment variables page) and object-storage buckets/env (`DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` are per-account — recreate object storage fresh).
- Dev `MYSQL_DATABASE_URL` points at Hostinger MySQL which rejects unknown IPs (see mysql-migration.md) — expect test-api to fail in a new environment until the allowlist is updated; this is env, not code.
- Keep the old account until the new one completes one successful typecheck + Hostinger zip build.
