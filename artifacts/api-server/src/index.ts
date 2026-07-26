import app from "./app";
import { logger } from "./lib/logger";
import { syncDeliveredOrders } from "./routes/orders";

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

  // Background delivered-status sync: keeps dispatched orders accurate even
  // when nobody opens the tracking page. syncDeliveredOrders never throws.
  const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  const INITIAL_DELAY_MS = 60 * 1000;      // let the server settle first
  setTimeout(() => {
    void syncDeliveredOrders(logger);
    setInterval(() => void syncDeliveredOrders(logger), SYNC_INTERVAL_MS).unref();
  }, INITIAL_DELAY_MS).unref();
});
