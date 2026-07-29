---
name: Preview down after task merges
description: Blank/broken preview caused by orphaned dev-server process holding the port after merge-triggered workflow restarts
---

# Preview down after task merges (port conflict)

**Symptom:** user reports blank/broken preview; web workflow status FAILED with `Error: Port <PORT> is already in use`; user's webview shows a broken-document icon until they refresh.

**Cause:** when several merged tasks restart workflows in quick succession, an old vite/node process can be orphaned and keep holding the artifact's assigned port, so the new workflow instance can't bind.

**How to fix:**
1. `ss`/`lsof` are NOT available in this container. Use `ps aux | grep -iE 'vite|node'` and identify orphans by old start time + artifact path in argv.
2. `kill -9` the orphaned PIDs (incl. stale pnpm parents and esbuild service processes from the same era).
3. Restart the workflow, then verify with a screenshot/curl on `http://localhost:80/`.

**Note:** the user's preview iframe does NOT auto-recover after the server comes back — it keeps the failure page until refreshed. Restarting the workflow again pushes the preview to reload; otherwise the user must press the ↻ arrow in the preview toolbar. Verify server-side with `curl https://$REPLIT_DEV_DOMAIN/` (external proxy path) as well as localhost.
