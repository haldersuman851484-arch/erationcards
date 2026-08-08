import app from "./app";
import { logger } from "./lib/logger";
import { syncDeliveredOrders } from "./routes/orders";
import { ensureOrdersSearchIndexes } from "./lib/ensureSearchIndexes";
import { ensureCashfreeColumns } from "./lib/ensureCashfreeColumns";

// A production host (e.g. Hostinger hPanel launching dist/index.mjs
// directly) can start the server with NODE_ENV unset. Several behaviors
// assume an explicit value — make the misconfiguration loud in the logs.
if (!process.env.NODE_ENV) {
  logger.warn(
    "NODE_ENV is not set. If this is the live site, set NODE_ENV=production in the host's environment variables — otherwise the canonical-host redirect stays off and logs use the dev format. See hostinger/.env.example.",
  );
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Self-heal the raw-SQL-only orders indexes (FULLTEXT search + created_at).
  // Runs once per boot, never throws; see ensureSearchIndexes.ts for why.
  void ensureOrdersSearchIndexes(logger);

  // Self-heal the Cashfree payment column the same way (dev boxes cannot
  // push schema to the Hostinger MySQL instance; see ensureCashfreeColumns).
  void ensureCashfreeColumns(logger);

  // Background delivered-status sync: keeps dispatched orders accurate even
  // when nobody opens the tracking page. syncDeliveredOrders never throws.
  const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  const INITIAL_DELAY_MS = 60 * 1000;      // let the server settle first
  setTimeout(() => {
    void syncDeliveredOrders(logger);
    setInterval(() => void syncDeliveredOrders(logger), SYNC_INTERVAL_MS).unref();
  }, INITIAL_DELAY_MS).unref();
});
