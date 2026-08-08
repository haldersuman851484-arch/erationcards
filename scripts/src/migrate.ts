import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsFolder = path.join(__dirname, "../../lib/db/migrations");

const dbUrl = process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Error: MYSQL_DATABASE_URL must be set.");
  process.exit(1);
}

function buildMysqlUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return raw;
  }
}

console.log("Connecting to database…");

// TLS is required for remote servers (Hostinger), but local practice servers
// (127.0.0.1) have no certificates and reject a TLS handshake outright.
const targetHost = (() => {
  try {
    // URL.hostname keeps brackets around IPv6 literals ("[::1]") — strip them
    // so the loopback allowlist below matches.
    return new URL(dbUrl).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return "";
  }
})();
const isLocalDb = ["127.0.0.1", "::1", "localhost"].includes(targetHost);

const connection = await mysql.createConnection({
  uri: buildMysqlUrl(dbUrl),
  ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
});

const db = drizzle(connection);

console.log(`Applying migrations from: ${migrationsFolder}`);

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
} finally {
  await connection.end();
}
