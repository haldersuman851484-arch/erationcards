import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// Minimal logger contract shared by pino (req.log) and the app logger.
type Log = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

/**
 * Boot-time self-heal for the two orders-table indexes that live only in the
 * raw SQL migration 0002_orders_search_indexes.sql (drizzle-orm has no
 * fulltext() builder for MySQL, so `drizzle-kit push`-style schema syncs and
 * hand-applied schema dumps both silently skip them).
 *
 * This bit the live launch: the production database was created without
 * `orders_search_ft`, so every admin name search (3+ chars) hit
 * MATCH ... AGAINST without a FULLTEXT index — MySQL error 1191 — and the
 * whole /orders list request answered 500. Checking at every boot costs two
 * information_schema lookups and permanently removes the "did anyone run
 * migration 0002 on this database?" failure mode.
 *
 * Never throws: a failure here must not stop the server (search degrades,
 * everything else works). Progress is mirrored to stderr because that is the
 * only stream reliably visible in Hostinger's Runtime Logs.
 */
const REQUIRED_INDEXES: ReadonlyArray<{ name: string; ddl: string }> = [
  {
    name: "orders_search_ft",
    ddl: "ALTER TABLE `orders` ADD FULLTEXT INDEX `orders_search_ft` (`customer_name`, `customer_phone`, `order_number`)",
  },
  {
    name: "orders_created_at_idx",
    ddl: "CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`)",
  },
];

async function indexExists(name: string): Promise<boolean> {
  const [rows] = await db.execute(sql`
    SELECT COUNT(*) AS n
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'orders'
      AND index_name = ${name}
  `);
  const first = Array.isArray(rows) ? (rows[0] as { n?: unknown } | undefined) : undefined;
  return Number(first?.n ?? 0) > 0;
}

export async function ensureOrdersSearchIndexes(log: Log): Promise<void> {
  for (const idx of REQUIRED_INDEXES) {
    try {
      if (await indexExists(idx.name)) {
        log.info({ index: idx.name }, "Orders index present");
        continue;
      }
      console.warn(`[SearchIndex] ${idx.name} is missing on this database — creating it now (one-time self-heal)`);
      await db.execute(sql.raw(idx.ddl));
      console.warn(`[SearchIndex] ${idx.name} created — admin search is fully enabled`);
      log.warn({ index: idx.name }, "Orders index was missing and has been created");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[SearchIndex] ${idx.name} check/create failed — admin search may be degraded: ${reason}`);
      log.error({ err, index: idx.name }, "Orders index self-heal failed");
    }
  }
}
