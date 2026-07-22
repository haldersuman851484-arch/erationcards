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

const connection = await mysql.createConnection({
  uri: buildMysqlUrl(dbUrl),
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(connection);

console.log(`Applying migrations from: ${migrationsFolder}`);

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
} finally {
  await connection.end();
}
