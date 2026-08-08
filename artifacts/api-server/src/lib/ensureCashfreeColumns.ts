import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// Minimal logger contract shared by pino (req.log) and the app logger.
type Log = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

/**
 * Boot-time self-heal for the orders.cf_order_id column (Cashfree payment
 * gateway reference). Same pattern as ensureSearchIndexes: the dev box cannot
 * reach the Hostinger MySQL instance, so schema changes made here land on the
 * live database the first time the deployed server boots — two cheap
 * information_schema lookups per boot buy the guarantee that "did anyone run
 * the migration?" can never take payments down.
 *
 * Never throws: a failure here must not stop the server (online payment
 * degrades to "temporarily unavailable", everything else works). Progress is
 * mirrored to stderr because that is the only stream reliably visible in
 * Hostinger's Runtime Logs.
 */
const REQUIRED_COLUMNS: ReadonlyArray<{ name: string; ddl: string }> = [
  {
    name: "cf_order_id",
    ddl: "ALTER TABLE `orders` ADD COLUMN `cf_order_id` TEXT NULL",
  },
];

async function columnExists(name: string): Promise<boolean> {
  const [rows] = await db.execute(sql`
    SELECT COUNT(*) AS n
    FROM information_schema.COLUMNS
    WHERE table_schema = DATABASE()
      AND table_name = 'orders'
      AND column_name = ${name}
  `);
  const first = Array.isArray(rows) ? (rows[0] as { n?: unknown } | undefined) : undefined;
  return Number(first?.n ?? 0) > 0;
}

export async function ensureCashfreeColumns(log: Log): Promise<void> {
  for (const col of REQUIRED_COLUMNS) {
    try {
      if (await columnExists(col.name)) {
        log.info({ column: col.name }, "Orders column present");
        continue;
      }
      console.warn(`[CashfreeColumn] orders.${col.name} is missing on this database — creating it now (one-time self-heal)`);
      await db.execute(sql.raw(col.ddl));
      console.warn(`[CashfreeColumn] orders.${col.name} created — online payments fully enabled`);
      log.warn({ column: col.name }, "Orders column was missing and has been created");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[CashfreeColumn] orders.${col.name} check/create failed — online payment may be degraded: ${reason}`);
      log.error({ err, column: col.name }, "Orders column self-heal failed");
    }
  }
}
